/* eslint-disable complexity */
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CustomConfigService } from 'src/config/custom-config.service';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Booking } from 'src/entities';
import { logger } from 'src/logger/logger';
import {
  BOOKING_FORM_URL,
  OPP_ACCESS_TTL,
  SUCCESS,
} from 'src/config/constants';
import {
  SfdcApplicant,
  SfdcOppPayload,
  SfdcSignatory,
} from './interfaces/sfdc-payload.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import {
  CreateLeadPayload,
  SfdcLeadPayload,
  SfdcUnitMappingPayload,
} from './interfaces/create-lead-payload.interface';
import { joinImageArray } from 'src/helpers';
import { PrimarySourceEnum } from 'src/enums/primary-sources.enum';
import { FormType, KYCTypeEnum } from 'src/enums/booking-form-status.enum';
import { getFormUrl } from 'src/helpers/bookings.helper';
import { normalizeProviderResponse } from 'src/helpers/customerCheck.helper';
import { httpGet, httpPost } from 'src/utils/http.utils';
import { SFDCLogEvent } from 'src/events/sfdc.events';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { SfdcEoiLeadApiStatus } from 'src/enums/eoi-form.enums';

@Injectable()
export class SfdcService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: CustomConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  async getAccessToken(key?: string): Promise<any> {
    try {
      const envKey =
        key && key.toLowerCase() === 'referral'
          ? 'REFERRAL_API_AUTH_URL'
          : 'USER_API_AUTH_URL';

      const cacheKey = `sfdc-token-${key ?? 'default'}`;
      const cachedData = await this.cacheService.get<any>(cacheKey);
      if (cachedData) {
        return cachedData;
      } else {
        const apiAuthURL = this.configService.getDecrypted(envKey);
        const response: {
          instance_url: string;
          access_token: string;
        } = await httpPost<{ instance_url: string; access_token: string }>(
          this.httpService,
          apiAuthURL,
          {},
        );

        if (response?.instance_url) {
          const tokenResponse = {
            statusCode: SUCCESS,
            message: 'Access Token generated.',
            data: response,
          };
          await this.cacheService.set(cacheKey, tokenResponse, 1800 * 1000); // Cache for 30 min
          return tokenResponse;
        } else {
          throw new UnauthorizedException();
        }
      }
    } catch (error) {
      logger.error('Failed to generate SFDC access Token:', error);
      logsAndErrorHandling('sfdcService - getAccessToken', error);
    }
  }

  async getUserOppAccess(username: string): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { instance_url, access_token } = authResponse;
        const apiURL = `${instance_url}/services/apexrest/UserOppAccess`;
        const apiRes = await lastValueFrom(
          this.httpService.post(
            apiURL,
            { username: username ?? '' },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${access_token}`,
              },
            },
          ),
        );

        const opportunities = apiRes?.data?.opportunities?.map((opp) => opp.Id);
        await this.cacheService.set(
          `user:opps:${username}`,
          opportunities,
          OPP_ACCESS_TTL,
        );

        return {
          statusCode: SUCCESS,
          message: 'User details Fetched successfully.',
          data: apiRes.data,
        };
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      logger.error('Failed to get opportunity list:', error);
      logsAndErrorHandling('sfdcService - getUserOppAccess', error, {
        username,
      });
    }
  }

  async searchUserList(username: string): Promise<any> {
    try {
      if (!username)
        throw new BadRequestException('Please type username in searchbox.');

      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { access_token } = authResponse;
        const apiURL = `${authResponse?.instance_url}/services/apexrest/Booking_Form?searchname=${username}`;
        const observable = this.httpService.post(
          apiURL,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${access_token}`,
            },
          },
        );

        // Use firstValueFrom to convert observable to promise
        const response = await firstValueFrom(observable);
        const parsedData = JSON.parse(response?.data);

        return {
          message: 'User list fetched successfully.',
          data: parsedData?.data ?? [],
        };
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      logger.error('Failed to fetch pick lists:', error);
      logsAndErrorHandling('sfdcService - searchUserList', error, {
        username,
      });
    }
  }

  //Send transformed booking details to Salesforce system
  async updateOpportunity(
    oppId: string,
    booking: Booking,
    referralCount: number,
    officeUse: any,
    isReset?: boolean,
  ): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { access_token } = authResponse;
        // Transform the booking data into the flat object format and include referral count
        const flatObject: SfdcOppPayload = this.transformToFlatObject(
          oppId,
          booking,
          officeUse,
          isReset,
        );
        flatObject.Referral_Count = referralCount ?? null;
        const apiURL = `${authResponse?.instance_url}/services/apexrest/Booking_Form`;
        // Make the HTTP request to SFDC API and return the response
        const observable = this.httpService.put(apiURL, flatObject, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
        });

        const response = await firstValueFrom(observable);
        const parsedData = JSON.parse(response.data);
        // Log SFDC response
        this.eventEmitter.emit(
          EventMessagesEnum.CREATE_SFDC_LOG,
          new SFDCLogEvent(
            oppId,
            EventMessagesEnum.OPP_UPDATED,
            flatObject,
            parsedData,
            parsedData?.status ?? 'Error',
          ),
        );
        return parsedData;
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      logger.error('Error sending booking data to SFDC API:', error);
      logsAndErrorHandling('sfdcService - updateOpportunity', error, {
        oppId,
      });
    }
  }

  async getOpportunityDetail(
    oppId: string,
    isRefreshed: boolean = false,
  ): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { access_token } = authResponse;

        const apiURL = `${authResponse?.instance_url}/services/apexrest/Booking_Form/${oppId}`;
        const cacheKey = `opportunity-details-${oppId}`;
        const cachedData = await this.cacheService.get<any>(cacheKey);

        if (cachedData && !isRefreshed) {
          const oppData = this.modifyOpportunityResponse(cachedData);
          return {
            message: 'Opportunity Details fetched successfully.',
            data: oppData,
          };
        }
        // Use firstValueFrom to convert the observable to a promise
        const response: {
          status: string;
          data: any;
        } = await httpGet<{ status: string; data: any }>(
          this.httpService,
          apiURL,
          access_token,
        );

        if (response?.status) {
          if (!response?.data?.ProjectName)
            response.data.ProjectName = 'Silversky';
          if (!response?.data?.projectBrandName)
            response.data.projectBrandName = 'Puravankara';
          await this.cacheService.set(cacheKey, response?.data);
          response.data = this.modifyOpportunityResponse(response?.data);
        } else {
          throw new NotFoundException();
        }

        return {
          message: 'Opportunity Details fetched successfully.',
          data: response?.data,
        };
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      logger.error('Failed to fetch opportunity details:', error);
      logsAndErrorHandling('sfdcService - getOpportunityDetail', error, {
        oppId,
      });
    }
  }

  private modifyOpportunityResponse(oppData: any) {
    if (oppData) {
      const salesTeam = [
        {
          rmName: {
            userName: oppData?.RM2NameEMPNo ?? '',
            userId: oppData?.RM2NameEMPId ?? '',
          },
          rmEmployeeId: oppData?.STM2EmpCode ?? '',
          tlName: {
            userName: oppData?.tl2Name ?? '',
            userId: oppData?.tl2Id ?? '',
          },
          tlEmployeeId: oppData?.ClosingTLEmpCode ?? '',
          rshName: {
            userName: oppData?.rsh2Name ?? '',
            userId: oppData?.rsh2Id ?? '',
          },
          rshEmployeeId: oppData?.ClosingRSHEmpCode ?? '',
        },
        {
          rmName: {
            userName: oppData?.rm1Name ?? '',
            userId: oppData?.rm1Id ?? '',
          },
          rmEmployeeId: oppData?.OpportunityOwnerEmpCode ?? '',
          tlName: {
            userName: oppData?.tl1Name ?? '',
            userId: oppData?.tl1Id ?? '',
          },
          tlEmployeeId: oppData?.SourcingTLEmpCode ?? '',
          rshName: {
            userName: oppData?.rsh1Name ?? '',
            userId: oppData?.rsh1Id ?? '',
          },
          rshEmployeeId: oppData?.SourcingRSHEmpCode ?? '',
        },
      ];

      if (oppData?.primarySource == PrimarySourceEnum.PURVA_PRIVILEGE) {
        salesTeam.push({
          rmName: {
            userName: oppData?.RM_3name ?? '',
            userId: oppData?.RM_3Id ?? '',
          },
          rmEmployeeId: oppData?.RM3EmpCode ?? '',
          tlName: {
            userName: oppData?.TL_3name ?? '',
            userId: oppData?.TL_3Id ?? '',
          },
          tlEmployeeId: oppData?.TL3EmpCode ?? '',
          rshName: {
            userName: oppData?.RSH_3name ?? '',
            userId: oppData?.RSH_3Id ?? '',
          },
          rshEmployeeId: oppData?.RSH3EmpCode ?? '',
        });
      }

      oppData.PreSales1NameEMPNo = {
        userName: oppData?.PreSales1NameEMPNo ?? '',
        userId: oppData?.PreSales1NameId ?? '',
      };
      oppData.PreSales2Name = {
        userName: oppData?.PreSales2Name ?? '',
        userId: oppData?.PreSales2Id ?? '',
      };
      oppData.PreSalesHeadName = {
        userName: oppData?.PreSalesHeadName ?? '',
        userId: oppData?.PreSalesHeadId ?? '',
      };
      oppData.businessHeadName = {
        userName: oppData?.businessHeadName ?? '',
        userId: oppData?.businessHeadId ?? '',
      };
      oppData.Loyalty_Team = {
        userName: oppData?.Loyalty_Team ?? '',
        userId: oppData?.Loyalty_TeamId ?? '',
      };
      oppData.Project_Head = {
        userName: oppData?.Project_Head ?? '',
        userId: oppData?.Project_HeadId ?? '',
      };
      oppData.salesTeam = salesTeam;
    }
    return oppData;
  }

  async getPickList(): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { instance_url, access_token } = authResponse;
        const apiURL = `${instance_url}/services/apexrest/WebsiteUtility/GetBookingPicklist`;
        const observable = this.httpService.post(
          apiURL,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${access_token}`,
            },
          },
        );

        // Use firstValueFrom to convert observable to promise
        const response = await firstValueFrom(observable);
        if (!response?.data) {
          throw new Error('No data received from the pick lists API');
        }

        delete response.data.status;
        return this.transformAndSortData(response.data);
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      logger.error('Failed to fetch pick lists:', error);
      logsAndErrorHandling('sfdcService - getPickList', error);
    }
  }

  async getInventory(projectName: string, blockName: string): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { instance_url, access_token } = authResponse;
        const apiURL = `${instance_url}/services/apexrest/inventory`;
        const observable = this.httpService.post(
          apiURL,
          { projectName, blockName },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${access_token}`,
            },
          },
        );

        // Use firstValueFrom to convert observable to promise
        const response = await firstValueFrom(observable);
        const parsedData =
          typeof response?.data === 'string'
            ? JSON.parse(response.data)
            : response?.data;

        return {
          statusCode: SUCCESS,
          message: parsedData?.message ?? 'Inventory fetched successfully.',
          data: parsedData?.data ?? [],
        };
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      logger.error('Failed to fetch inventory:', error);
      logsAndErrorHandling('sfdcService - getInventory', error, {
        projectName,
        blockName,
      });
    }
  }

  //Create an payload to send Booking details on SFDC
  private transformToFlatObject(
    oppId: string,
    data: any,
    officeUse: any,
    isReset: boolean,
  ): SfdcOppPayload {
    try {
      const s3BasePath = this.configService.get<string>('AWS_S3_ACCESS_URL');
      const kycBasePath = this.configService.get<string>('KYC_PAGE_URL');
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      const puravankaraBaseUrl = this.configService.get<string>(
        'PURAVANKARA_BASE_URL',
      );
      const purvalandBaseUrl =
        this.configService.get<string>('PURVALAND_BASE_URL');
      const provientBaseUrl =
        this.configService.get<string>('PROVIDENT_BASE_URL');

      const configOptions = {
        bookingFormUrl: `${puravankaraBaseUrl}/${BOOKING_FORM_URL}`,
        nodeEnv,
        purvalandBookingFormUrl: `${purvalandBaseUrl}/${BOOKING_FORM_URL}`,
        provientBookingFormUrl: `${provientBaseUrl}/${BOOKING_FORM_URL}`,
      };

      // Build normalized applicants array (authoritative for 1..4 applicants)
      let applicants = [];
      if (data?.bookingAs == BookingAsEnum.INDIVIDUAL) {
        applicants = this.buildApplicants(data, s3BasePath);
      } else {
        applicants = this.buildSignatories(data, s3BasePath);
      }
      const dataObj: SfdcOppPayload = {
        Oppid: oppId ?? '',
        opportunityToApplicantType: data?.fillingAs ?? 1,
        numOfApplications: data?.noOfApplicants ?? 1,
        applicantRelation_2nd: '',
        applicantRelation_3nd: '',
        applicantRelation_4nd: '',
        OppName: data?.referrerDetails?.name?.substring(0, 100) ?? '',
        EmailAddress: data?.referrerDetails?.email ?? '',
        MobileNumber: `${data?.referrerDetails?.countryCode ?? ''}${data?.referrerDetails?.mobileNumber ?? ''}`,
        relationshipWithReference:
          data?.referrerDetails?.relation?.substring(0, 40) ?? '',
        PropoertyName: data?.referrerDetails?.propertyName ?? '',
        UnitNumber: data?.referrerDetails?.unitNumber ?? '',
        AlternatePhone: `${data?.referrerDetails?.altCountryCode ?? ''}${data?.referrerDetails?.altMobileNumber ?? ''}`,
        CurrentresidentialAddress:
          data?.referrerDetails?.address?.substring(0, 255) ?? '',
        Referrer_Unit_No__c: data?.referrerDetails?.houseNumber ?? '',
        ReferralPoints: data?.referrerDetails?.pointsAdjustment ? 'Yes' : 'No',
        bookingFormStatus: data?.bookingFormStatus ?? '',
        bookingDetails: !isReset
          ? s3BasePath + (data?.mergedPdf ?? data?.unsignedPdf ?? '')
          : '',
        Form_Fill_Started_Time: data?.createdAt ?? null,
        Form_Fill_End_Time: data?.formFilledAt ?? null,
        Form_fully_Signed_Time: data?.formSignedAt ?? null,
        NPS_Score: data?.rating ?? null,
        NPS_Remarks: data?.feedback?.substring(0, 255) ?? '',
        Customer_s_Remarks_During_Booking:
          data?.documentsNote?.substring(0, 255) ?? '',
        ReferralAdjustmentThroughPortal: false,
        BookingApplicationDocuments: `${kycBasePath}/${oppId}`,
        documents: [],
        applicants,
        MultiUnitBooking: data?.groupId ? 'Yes' : 'No',
        BookingAmountAdjustment: 'Unique',
        BookingCategory: data?.bookingAs ?? '',
      };

      /** Special handling for Corporate/Partnership bookings */
      if (
        data?.bookingAs === BookingAsEnum.CORPORATE ||
        data?.bookingAs === BookingAsEnum.PARTNERSHIP_FIRM
      ) {
        dataObj.firstName = data?.companyDetails?.companyName ?? '';
        dataObj.permanentAddress = data?.companyDetails?.companyAddress ?? '';
        dataObj.gstNo = data?.companyDetails?.gstNumber ?? '';
        dataObj.panNo = data?.companyDetails?.companyPan ?? '';
      }

      if (!isReset) {
        dataObj.ProjectName = data?.unitDetails?.projectName ?? '';
        dataObj.CarParkType = data?.unitDetails?.carParkType ?? '';
        dataObj.UnitNo = data?.unitDetails?.unitNumber ?? '';
        dataObj.Floor = data?.unitDetails?.floor ?? '';
        dataObj.BlockTower = data?.unitDetails?.blockTower ?? '';
        dataObj.unitType = data?.unitDetails?.type ?? '';
        dataObj.SuperBuiltupAreaSFt = data?.unitDetails?.superBuiltArea ?? '';
        dataObj.TotalAgreementValue =
          data?.unitDetails?.totalAgreementValue?.toString()?.substring(0, 9) ??
          '';
      }

      // Office use details
      if (officeUse && data?.officeUsePdf) {
        const officeInfo = officeUse?.officeInfo ?? {};
        dataObj.EnquiryReferenceNo =
          officeUse?.enquiryRefNumber ?? data?.enquiryId;
        dataObj.Sales_Co_ordinator_Remarks =
          officeUse?.remarks?.substring(0, 255) ?? '';
        dataObj.referedEmp = officeInfo?.employeeName ?? '';
        dataObj.Referred_Employee_Id =
          officeInfo?.employeeId?.substring(0, 10) ?? '';
        dataObj.Corporate_Sales_Verification =
          officeUse?.isCorporateSale ?? false;
        dataObj.RERANo = officeUse?.cpReraNumber ?? '';
        dataObj.rm1Name = officeInfo?.salesTeam?.[1]?.rmName?.userId ?? '';
        dataObj.tl1Name = officeInfo?.salesTeam?.[1]?.tlName?.userId ?? '';
        dataObj.rsh1Name = officeInfo?.salesTeam?.[1]?.rshName?.userId ?? '';
        dataObj.RM2NameEMPNo = officeInfo?.salesTeam?.[0]?.rmName?.userId ?? '';
        dataObj.tl2Name = officeInfo?.salesTeam?.[0]?.tlName?.userId ?? '';
        dataObj.rsh2Name = officeInfo?.salesTeam?.[0]?.rshName?.userId ?? '';
        dataObj.RM_3name = officeInfo?.salesTeam?.[2]?.rmName?.userId ?? '';
        dataObj.TL_3name = officeInfo?.salesTeam?.[2]?.tlName?.userId ?? '';
        dataObj.RSH_3name = officeInfo?.salesTeam?.[2]?.rshName?.userId ?? '';
        dataObj.PreSales1NameEMPNo = officeInfo?.preSales1Name?.userId ?? '';
        dataObj.PreSales2Name = officeInfo?.preSales2Name?.userId ?? '';
        dataObj.PreSalesHeadName = officeInfo?.preSalesHeadName?.userId ?? '';
        dataObj.Loyalty_Team = officeInfo?.loyaltyTeamName?.userId ?? '';
        dataObj.Project_Head = officeInfo?.projectHeadName?.userId ?? '';
        dataObj.businessHeadName = officeInfo?.businessHeadName?.userId ?? '';
        dataObj.BookingRegionAsPerRM = officeUse?.bookingRegionAsPerRM ?? '';
        dataObj.GST_Certificate_URL = data?.officeUsePdf
          ? s3BasePath + data?.officeUsePdf
          : '';
      }

      // Documents
      const documents: Array<{ docName: string; docVal: string }> = [];
      if (!isReset) {
        documents.push({
          docName: 'application form',
          docVal: getFormUrl(
            FormType.BOOKING,
            data?.unitDetails?.projectBrandName ?? '',
            data?.opportunityId ?? '',
            configOptions,
          )?.substring(0, 255),
        });
      }

      if (data?.fillingAs && data?.relationBtApplicants) {
        const relationMapping: { [key: number]: string } = {
          1: 'applicantRelation_2nd',
          2: 'applicantRelation_2nd',
          3: 'applicantRelation_3nd',
          4: 'applicantRelation_4nd',
        };
        const relationKey = relationMapping[data.fillingAs];
        if (relationKey)
          (dataObj as any)[relationKey] = data.relationBtApplicants;
      }

      // Map transaction details if available
      if (data?.payments) {
        this.mapTransactionsToDataObj(dataObj, data);
      }

      dataObj.documents = [...dataObj.documents, ...documents];
      return dataObj;
    } catch (error) {
      logger.error('Error sending booking data to SFDC API:', error);
      logsAndErrorHandling('sfdcService - transformToFlatObject', error, {
        oppId,
      });
    }
  }

  private mapTransactionsToDataObj(dataObj: any, data: any) {
    const transactions = data?.payments ?? [];
    const totalTransaction = transactions.length;

    if (!totalTransaction) return;

    transactions.slice(0, 3).forEach((transaction, index) => {
      const key = `Transaction${index + 1}ModeID`;
      const transactionId =
        transaction?.paymentDetails?.gatewayPaymentId ||
        transaction?.paymentDetails?.transactionNumber ||
        transaction?.paymentDetails?.chequeNumber ||
        '';
      const rawMethod = transaction?.paymentDetails?.method?.trim() || '';
      const method = /upi/i.test(rawMethod) ? 'UPI' : rawMethod || '';
      dataObj[key] = `${index + 1}/${totalTransaction}, ${
        transactionId ?? ''
      }, ${transaction?.paidAmount ?? ''}, ${method}`;
    });
  }

  //To create referral lead on salesforce system
  async createLeadOnSFDC(referrals: any[]): Promise<void> {
    try {
      const { data: authResponse } = await this.getAccessToken('referral');
      if (authResponse?.instance_url) {
        const { instance_url, access_token } = authResponse;
        const leadCreationURL = `${instance_url}/services/apexrest/CreateLeadApi`;
        await Promise.all(
          referrals.map(async (referral) => {
            // Create Lead on SFDC system
            const transFormedData = this.transformReferralObj(referral);
            const apiRes = await lastValueFrom(
              this.httpService.post(leadCreationURL, transFormedData, {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${access_token}`,
                },
              }),
            );

            // Save SFDC logs
            this.eventEmitter.emit(
              EventMessagesEnum.CREATE_SFDC_LOG,
              new SFDCLogEvent(
                transFormedData.referredCustomer,
                EventMessagesEnum.LEAD_CREATED,
                transFormedData,
                {
                  status: apiRes?.status,
                  data: apiRes?.data,
                  statusText: apiRes?.statusText,
                },
                'success',
              ),
            );
            logger.info(
              `Data Pushed to the Lead Creation API Status is ~~~~~~ ${apiRes.status} and Status text is ${apiRes.statusText}`,
            );
          }),
        );
      }
    } catch (error) {
      logger.error('Failed to create lead on SFDC:', error);
      logsAndErrorHandling('sfdcService - createLeadOnSFDC', error, {
        referrals,
      });
    }
  }

  private transformReferralObj(data: any): CreateLeadPayload {
    try {
      const fullName = data?.fullName ?? '';
      const nameParts = fullName.split(' ');

      //if Name have multiple parts then send first part as firstName  and rest as lastName
      // if name have single word without space then push it to lastName and leave first name blank as got confirmation from client
      return {
        referredCustomer: data?.opportunityId ?? '',
        firstName: nameParts.length > 1 ? nameParts[0] : '',
        lastName:
          nameParts.length > 1
            ? nameParts.slice(1).join(' ')
            : nameParts[0] || '',
        email: data?.email ?? '',
        phone: `${data?.countryCode ?? ''}${data?.mobileNumber ?? ''}`,
        city: data?.projectCity ?? '',
        company: data?.fullName ?? '',
        primarySource: data?.primarySource ?? '',
        secondarySource: data?.secondarySource ?? 'Referral at booking',
        projectInterested: data?.referredApartment ?? '',
      };
    } catch (error) {
      logger.error('Failed to create lead on SFDC:', error);
      logsAndErrorHandling('sfdcService - transformReferralObj', error, {
        data,
      });
    }
  }

  // Convert Objects to Array of objects
  private transformAndSortData(data: Record<string, any>) {
    try {
      const transformedData: Record<string, any> = {};

      Object.keys(data).forEach((key) => {
        const value = data[key];

        if (typeof value === 'object' && !Array.isArray(value)) {
          const reversedEntries = Object.entries(value)
            .map(([name, value]) => {
              return { name, value };
            })
            .filter((item) => item !== null);

          transformedData[key] = reversedEntries;
        } else {
          transformedData[key] = value;
        }
      });

      return transformedData;
    } catch (error) {
      logger.error('Failed to fetch pick lists:', error);
      logsAndErrorHandling('sfdcService - transformAndSortData', error, {
        data,
      });
    }
  }

  /**
   * This method fetches the list of users from the Salesforce instance.
   *
   * @returns A promise that resolves to the list of users or an error.
   */
  async getUsers(): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { instance_url, access_token } = authResponse;
        const apiURL = `${instance_url}/services/apexrest/getUsers`;
        const apiRes: {
          status: string;
          data: any[];
        } = await httpGet<{ status: string; data: any[] }>(
          this.httpService,
          apiURL,
          access_token,
        );

        return {
          statusCode: SUCCESS,
          message: 'Users fetched successfully.',
          data: apiRes,
        };
      }
    } catch (error) {
      logger.error('Failed to get users list:', error);
      logsAndErrorHandling('sfdcService - getUsers', error);
    }
  }

  /**
   * Fetches the list of channel partners based on the search term.
   *
   * @param search - The search term to filter channel partners.
   * @returns A promise that resolves to the list of channel partners or an error.
   *
   */
  async getChannelPartnerList(search: string): Promise<any> {
    try {
      const { data: authResponse } = await this.getAccessToken();
      if (authResponse?.instance_url) {
        const { instance_url, access_token } = authResponse;
        const apiURL = `${instance_url}/services/apexrest/WebsiteUtility?searchname=${search}`;

        const response: {
          status: string;
          data: any[];
        } = await httpGet<{ status: string; data: any[] }>(
          this.httpService,
          apiURL,
          access_token,
        );

        return {
          statusCode: SUCCESS,
          message: response?.data?.length
            ? 'CP list fetched successfully.'
            : response?.status,
          data: response?.data ?? [],
        };
      }
    } catch (error) {
      logger.error('Failed to get CP list:', error);
      logsAndErrorHandling('sfdcService - getChannelPartnerList', error, {
        search,
      });
    }
  }

  async postToSiteVisit(body: Record<string, any>): Promise<any> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };

    try {
      const { data: authResponse } = await this.getAccessToken('referral');
      if (authResponse?.access_token) {
        const url = `${authResponse.instance_url}/services/apexrest/sitevisitleadWithWelcome/`;
        const res = await lastValueFrom(
          this.httpService.post(url, body, {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 15000,
          }),
        );
        const normalized = normalizeProviderResponse(res?.data);
        if (
          normalized &&
          typeof normalized === 'object' &&
          'error' in normalized
        ) {
          const errMsg = String(normalized?.error ?? '').trim();
          if (errMsg) {
            throw new NotFoundException(errMsg);
          }
        }
        return normalized;
      } else throw new UnauthorizedException('Missing SFDC access token');
    } catch (error) {
      logger.error('Site visit API call failed:', error);
      logsAndErrorHandling('sfdcService - postToSiteVisit', error, {
        body,
      });
    }
  }

  async createNewLeadInSFDC(body: Record<string, any>): Promise<any> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };

    try {
      const { data: authResponse } = await this.getAccessToken('referral');
      if (authResponse?.access_token) {
        const url = `${authResponse.instance_url}/services/apexrest/sitevisitleadWithWelcome/`;
        const res = await lastValueFrom(
          this.httpService.put(url, body, {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 15000,
          }),
        );
        const normalized = normalizeProviderResponse(res?.data);
        if (
          normalized &&
          typeof normalized === 'object' &&
          'error' in normalized
        ) {
          const errMsg = String(normalized?.error ?? '').trim();
          if (errMsg) {
            throw new NotFoundException(errMsg);
          }
        }
        return normalized;
      } else throw new UnauthorizedException('Missing SFDC access token');
    } catch (error) {
      logger.error('Create Lead API call failed:', error);
      logsAndErrorHandling('sfdcService - createNewLeadInSFDC', error, {
        body,
      });
    }
  }

  async postSiteVisitToSFDC(body: Record<string, any>): Promise<any> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };

    try {
      const { data: authResponse } = await this.getAccessToken('referral');
      if (authResponse?.access_token) {
        const url = `${authResponse.instance_url}/services/apexrest/sitevisitleadWithWelcome/`;
        const res = await lastValueFrom(
          this.httpService.put(url, body, {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 10000,
          }),
        );
        logger.info('sfdcService', res?.data);
        const normalized = normalizeProviderResponse(res?.data);
        if (
          normalized &&
          typeof normalized === 'object' &&
          'error' in normalized
        ) {
          const errMsg = String(normalized?.error ?? '').trim();
          if (errMsg) {
            throw new NotFoundException(errMsg);
          }
        }
        this.eventEmitter.emit(
          EventMessagesEnum.CREATE_SFDC_LOG,
          new SFDCLogEvent(
            body?.enqRefNo,
            EventMessagesEnum.SV_FORM,
            body,
            normalized,
            normalized?.status ?? 'Error',
          ),
        );
      } else throw new UnauthorizedException('Missing SFDC access token');
    } catch (error) {
      logger.error('Site visit API call failed:', error);
      logsAndErrorHandling('sfdcService - postSiteVisitToSFDC', error, {
        body,
      });
    }
  }

  private buildApplicants(data: any, s3BasePath: string): SfdcApplicant[] {
    const join = (v: any) => joinImageArray(v ?? '', ', ', s3BasePath) || '';
    const firstOf = (s: string) => (s.split(',')[0] || '').trim();

    const rows = [
      {
        label: 'Primary Applicant' as const,
        node: data?.applicant1,
        relation: 'Self',
        idx: 0,
      },
      {
        label: 'Second Applicant' as const,
        node: data?.applicant2,
        relation: data?.relationBtApplicants || 'Spouse',
        idx: 1,
      },
      {
        label: 'Third Applicant' as const,
        node: data?.applicant3,
        relation: data?.relationBtApplicants || '',
        idx: 2,
      },
      {
        label: 'Fourth Applicant' as const,
        node: data?.applicant4,
        relation: data?.relationBtApplicants || '',
        idx: 3,
      },
    ].filter((s) => s.node);

    return rows.map((s) => {
      const personalDetails = s.node?.personalDetails || {};
      const contactDetails = s.node?.contactDetails || {};
      const prof = s.node?.professionalDetails || {};
      const pAddress = contactDetails?.permanentAddress || {};
      const cAddress = contactDetails?.communicationAddress || {};

      const aadharURL = firstOf(join(personalDetails?.aadhaarImage));
      const panURL = firstOf(join(personalDetails?.panImage));
      const ociURL = firstOf(join(personalDetails?.OCIImage));
      const ociAltURL = firstOf(join(personalDetails?.addressProofImage));
      const gstURL = firstOf(join(prof?.gstCertificate));
      const photoURL = firstOf(join(personalDetails?.image));

      let kycMode =
        personalDetails?.isAadhaarOcrDone || personalDetails?.isPanOcrDone
          ? KYCTypeEnum.OCR
          : KYCTypeEnum.APPLIED;
      if (personalDetails?.isAadhaarVerified) kycMode = KYCTypeEnum.DIGILOCKER;
      return {
        ...(s.node?.contactId && {
          appId: s.node.contactId,
        }),
        applicantType: s.label,
        salutation: personalDetails?.salutation ?? '',
        firstName: String(personalDetails?.firstName ?? '').substring(0, 120),
        lastName: String(
          personalDetails?.lastName ?? personalDetails?.firstName ?? '',
        ).substring(0, 30),
        phone: `${contactDetails?.countryCode ?? ''}${contactDetails?.contactNumber ?? ''}`,
        alternatePhone: `${contactDetails?.alternateCountryCode ?? ''}${contactDetails?.alternateContactNumber ?? ''}`,
        email: String(contactDetails?.emailAddress ?? '').substring(0, 255),
        anniversaryDate: contactDetails?.anniversaryDate ?? null,
        relationWithApplicant: s.idx === 0 ? 'Self' : s.relation || '',
        gender: String(personalDetails?.gender ?? ''),
        occupation: prof?.occupation ?? '',
        birthdate: personalDetails?.dob ?? '',
        maritalStatus: String(contactDetails?.maritalStatus ?? ''),
        residentialStatus: personalDetails?.residentStatus ?? '',
        aadharNo: personalDetails?.aadhaarNumber ?? '',
        AaadharVerified: personalDetails?.isAadhaarVerified ?? false,
        aadharURL,
        panNo: personalDetails?.panNumber ?? '',
        PANVerified: personalDetails?.isPanVerified ?? false,
        panURL,
        passportNo: personalDetails?.passportNumber ?? '',
        ociNo: personalDetails?.ociNumber ?? '',
        ociURL,
        ociAlternateType: String(
          personalDetails?.addressProofType ?? '',
        ).substring(0, 100),
        ociAlternateURL: ociAltURL,
        designation: prof?.designation ?? '',
        designationOthers: String(prof?.designationIfOthers ?? '').substring(
          0,
          100,
        ),
        educationalQualification: prof?.educationalQualification ?? '',
        companyName: '',
        companyNameOthers: String(prof?.companyName ?? '').substring(0, 100),
        industry: prof?.industry ?? '',
        industryOthers: String(prof?.industryIfOthers ?? '').substring(0, 60),
        perStreet: [
          pAddress?.houseNumber,
          String(pAddress?.areaName ?? '').substring(0, 200),
        ]
          .filter(Boolean)
          .join(', '),
        perCity: pAddress?.city ?? '',
        perState: pAddress?.state ?? '',
        perPostalCode: pAddress?.pinCode ?? '',
        perCountry: pAddress?.country ?? '',
        comStreet: [
          cAddress?.houseNumber,
          String(cAddress?.areaName ?? '').substring(0, 200),
        ]
          .filter(Boolean)
          .join(', '),
        comCity: cAddress?.city ?? '',
        comState: cAddress?.state ?? '',
        comPostalCode: cAddress?.pinCode ?? '',
        comCountry: cAddress?.country ?? '',
        countryOfResidence: personalDetails?.nriCountry || 'India',
        gstNo: prof?.gstNumber ?? '',
        gstDetails: prof?.isGstClaimed ? 'Registered' : '',
        gstURL: gstURL,
        orgType: prof?.organizationType ?? 'Other',
        Applicant_Photo_URL: photoURL,
        Mother_Tongue: contactDetails?.motherTongue ?? '',
        NameAsPerPAN: personalDetails?.nameAsPerPan ?? '',
        NameAsPerAaadhar: personalDetails?.nameAsPerAadhaar ?? '',
        PrimaryDocument: personalDetails?.primaryDocument ?? '',
        KYCMode: kycMode,
      };
    });
  }

  private buildSignatories(data: any, s3BasePath: string): SfdcSignatory[] {
    const join = (v: any) => joinImageArray(v ?? '', ', ', s3BasePath) || '';
    const firstOf = (s: string) => (s.split(',')[0] || '').trim();

    const rows = [
      {
        label: 'Primary Applicant' as const,
        node: data?.applicant1,
        relation: 'Self',
        idx: 0,
      },
      {
        label: 'Second Applicant' as const,
        node: data?.applicant2,
        relation: data?.relationBtApplicants || 'Spouse',
        idx: 1,
      },
      {
        label: 'Third Applicant' as const,
        node: data?.applicant3,
        relation: data?.relationBtApplicants || '',
        idx: 2,
      },
      {
        label: 'Fourth Applicant' as const,
        node: data?.applicant4,
        relation: data?.relationBtApplicants || '',
        idx: 3,
      },
    ].filter((s) => s.node);

    return rows.map((s) => {
      const personalDetails = s.node?.personalDetails || {};
      const aadharURL = firstOf(join(personalDetails?.aadhaarImage));
      const panURL = firstOf(join(personalDetails?.panImage));
      const firstName = String(personalDetails?.firstName ?? '').substring(
        0,
        120,
      );
      const lastName = String(personalDetails?.lastName ?? '').substring(0, 30);
      let kycMode =
        personalDetails?.isAadhaarOcrDone || personalDetails?.isPanOcrDone
          ? KYCTypeEnum.OCR
          : KYCTypeEnum.APPLIED;
      if (personalDetails?.isAadhaarVerified) kycMode = KYCTypeEnum.DIGILOCKER;
      const phone = `${personalDetails?.countryCode ?? ''}${personalDetails?.contactNumber ?? ''}`;
      const authEmail = String(personalDetails?.emailAddress ?? '').substring(
        0,
        255,
      );
      const fullName = `${firstName} ${lastName}`.trim();
      return {
        ...(s.node?.contactId && {
          appId: s.node.contactId,
        }),
        applicantType: s.label,
        salutation: personalDetails?.salutation ?? '',
        firstName: fullName,
        AuthName: fullName,
        phone,
        authPhone: phone,
        authEmail,
        email: authEmail,
        authePAN: personalDetails?.panNumber ?? '',
        panURL,
        authAadhaar: personalDetails?.aadhaarNumber ?? '',
        aadharURL,
        PANVerified: personalDetails?.isPanVerified ?? false,
        AaadharVerified: personalDetails?.isAadhaarVerified ?? false,
        NameAsPerPAN: personalDetails?.nameAsPerPan ?? '',
        NameAsPerAaadhar: personalDetails?.nameAsPerAadhaar ?? '',
        Applicant_Photo_URL: firstOf(join(personalDetails?.image)),
        PrimaryDocument: personalDetails?.primaryDocument ?? '',
        KYCMode: kycMode,
      };
    });
  }

  async visitList(): Promise<any> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };

    try {
      const { data: authResponse } = await this.getAccessToken('referral');
      if (authResponse?.access_token) {
        const url = `${authResponse.instance_url}/services/apexrest/leadsitevisits/`;
        const res = await lastValueFrom(
          this.httpService.get(url, {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 15000,
          }),
        );
        const normalized = normalizeProviderResponse(res?.data);
        if (
          normalized &&
          typeof normalized === 'object' &&
          'error' in normalized
        ) {
          const errMsg = String(normalized?.error ?? '').trim();
          if (errMsg) {
            throw new NotFoundException(errMsg);
          }
        }
        return normalized;
      } else throw new UnauthorizedException('Missing SFDC access token');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Site visit API(sitevisitleadWithWelcome) call failed: ${error?.message ?? error}`,
      );
    }
  }

  async greUpdateToSFDC(body: Record<string, any>): Promise<any> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };

    try {
      logger.info('body', body);
      const { data: authResponse } = await this.getAccessToken('referral');
      logger.info('data', authResponse);
      if (authResponse?.access_token) {
        const url = `${authResponse.instance_url}/services/apexrest/UpdatingtheLead/`;
        const res = await lastValueFrom(
          this.httpService.put(url, body, {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 10000,
          }),
        );
        logger.info('sfdcService', res?.data);
        const normalized = normalizeProviderResponse(res?.data);
        if (
          normalized &&
          typeof normalized === 'object' &&
          'error' in normalized
        ) {
          const errMsg = String(normalized?.error ?? '').trim();
          if (errMsg) {
            throw new NotFoundException(errMsg);
          }
        }
        this.eventEmitter.emit(
          EventMessagesEnum.CREATE_SFDC_LOG,
          new SFDCLogEvent(
            body?.enqRefNo,
            EventMessagesEnum.SV_FORM,
            body,
            normalized,
            normalized?.status ?? 'Error',
          ),
        );
      } else throw new UnauthorizedException('Missing SFDC access token');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Site visit API(sitevisitleadWithWelcome) call failed: ${error?.message ?? error}`,
      );
    }
  }

  /**
   * Pushes EOI (Expression of Interest) leads to SFDC in bulk.
   * Transforms the SFDC response and returns success/error status for each record.
   *
   * @param batchId - Unique identifier for the batch of records being pushed
   * @param records - Array of lead records to be pushed to SFDC
   * @returns Promise containing array of results with opportunityId, success status, leadId, enquiryId and error (if any)
   */
  async pushEOILeads(
    batchId: string,
    records: SfdcLeadPayload[],
  ): Promise<
    {
      opportunityId: string;
      success: boolean;
      leadId?: string;
      enquiryId?: string;
      error?: string;
    }[]
  > {
    logger.info(`Pushing the records for Batch Id ${batchId} to SFDC`);
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };
    const { data: authResponse } = await this.getAccessToken();
    if (!authResponse?.access_token) {
      throw new UnauthorizedException('Missing SFDC access token');
    }

    const url = `${authResponse.instance_url}/services/apexrest/siteVisitLeadCreation/bulkV2`;

    try {
      const res = await lastValueFrom(
        this.httpService.post(
          url,
          { records },
          {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 15000,
          },
        ),
      );

      const raw = res.data;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed?.results || !Array.isArray(parsed.results)) {
        throw new Error(`Invalid SFDC response format for Batch Id ${batchId}`);
      }
      logger.info(
        `Successfully pushed the records for Batch Id ${batchId} to SFDC`,
        {
          batchId,
          response: parsed,
        },
      );
      return parsed.results.map((r) => ({
        opportunityId: r?.opportunityId,
        success: !!(r?.opportunityId || r?.enquiryRefNo),
        uniqueReferenceId: r?.PRID,
        enquiryId: r?.enquiryRefNo,
        voucherId: r?.voucherId,
        raw: r,
        error: r?.status == SfdcEoiLeadApiStatus.ERROR ? r?.message : undefined,
      }));
    } catch (error) {
      logger.error('SFDC site visit bulk push failed', {
        batchId,
        message: error.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      return logsAndErrorHandling('sfdcService - pushEOILeads', error, {
        batchSize: records.length,
      });
    }
  }

  /**
   * Maps units to vouchers on SFDC by pushing records in bulk.
   * Transforms the response and returns success/error status for each record.
   */
  async pushUnitMappingToSFDC(records: SfdcUnitMappingPayload[]): Promise<
    {
      paymentRefId: string;
      voucherId?: string;
      success: boolean;
      error?: string;
    }[]
  > {
    logger.info(`Mapping units to voucher on SFDC`);
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    };

    const { data: authResponse } = await this.getAccessToken();
    if (!authResponse?.access_token) {
      throw new UnauthorizedException('Missing SFDC access token');
    }

    const url = `${authResponse.instance_url}/services/apexrest/siteVisitLeadCreation/bulkV2`;
    try {
      const res = await lastValueFrom(
        this.httpService.post(
          url,
          { records },
          {
            headers: {
              ...baseHeaders,
              Authorization: `Bearer ${authResponse.access_token}`,
            },
            timeout: 15000,
          },
        ),
      );

      const raw = res.data;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed?.results || !Array.isArray(parsed.results)) {
        throw new Error(`Invalid SFDC response format for unit mapping`);
      }
      logger.info(`Units successfully mapped  to SFDC`, {
        response: parsed,
      });

      return parsed.results.map((r) => ({
        opportunityId: r?.opportunityId,
        success: !!(r?.opportunityId || r?.enquiryRefNo),
        uniqueReferenceId: r?.PRID,
        enquiryId: r?.enquiryRefNo,
        voucherId: r?.voucherId,
        raw: r,
        error: r?.status == SfdcEoiLeadApiStatus.ERROR ? r?.message : undefined,
      }));
    } catch (error) {
      logger.error('SFDC unit mapping failed', {
        message: error.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      return logsAndErrorHandling('sfdcService - mapUnitsOnSFDC', error, {
        batchSize: records.length,
      });
    }
  }
}
