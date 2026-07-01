import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { BookingDocument } from './entities/booking_document.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingDocumentsDto } from './dto/booking_documents.dto';
import { logger } from 'src/logger/logger';
import { SUCCESS } from 'src/config/constants';
import { BookingOfficeUse } from '../bookings/entities/booking_office_use.entity';
import { Booking, VoucherForm } from 'src/entities';

@Injectable()
export class BookingDocumentsService {
  constructor(
    @InjectRepository(BookingDocument)
    private readonly bookingDocumentsRepository: Repository<BookingDocument>,
    @InjectRepository(BookingOfficeUse)
    private readonly bookingOfficeUseRepository: Repository<BookingOfficeUse>,
    @InjectRepository(Booking)
    private readonly booking: Repository<Booking>,
    @InjectRepository(VoucherForm)
    private readonly voucherRepository: Repository<VoucherForm>,
  ) {}

  //To save booking document details
  async createDocument(
    bookingDocumentsDto: BookingDocumentsDto,
    user: any,
  ): Promise<any> {
    try {
      const { name, path, type, stage, isOtherDoc } = bookingDocumentsDto;
      let { opportunityId, voucherId } = bookingDocumentsDto;
      if (!opportunityId && !voucherId) {
        throw new BadRequestException(
          'Either opportunityId or voucherId is required.',
        );
      }

      // If opportunityId comes, fetch voucherId
      if (opportunityId && !voucherId) {
        const booking = await this.booking.findOne({
          where: { opportunityId },
          select: ['voucherId'],
        });

        if (booking?.voucherId) {
          voucherId = booking.voucherId;
        }
      }

      // If voucherId comes, fetch opportunityId
      if (voucherId && !opportunityId) {
        const voucher = await this.voucherRepository.findOne({
          where: { id: voucherId },
          select: ['opportunityId'],
        });

        if (voucher?.opportunityId) {
          opportunityId = voucher.opportunityId;
        }
      }

      const document = this.bookingDocumentsRepository.create({
        opportunityId,
        voucherId,
        name,
        path,
        type,
        stage,
        isOtherDoc,
      });

      await this.bookingDocumentsRepository.save(document);

      // Update closing_rm_id in booking_office_use table
      if (user?.dbId && opportunityId) {
        await this.updateOfficeUseClosingRm(opportunityId, user.dbId);
      }

      return {
        message: 'Document created successfully.',
        data: document,
      };
    } catch (error) {
      logger.error('Failed to save document details:', error);
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to save document details: ${error?.message}`,
      );
    }
  }

  /**
   * Updates or creates a booking_office_use record with closing_rm_id.
   * @param opportunityId - The opportunity ID
   * @param closingRmId - The closing RM ID to set
   */
  private async updateOfficeUseClosingRm(
    opportunityId: string,
    closingRmId: number,
  ): Promise<void> {
    const existingOfficeUse = await this.bookingOfficeUseRepository.findOne({
      where: { opportunityId },
    });

    const closingRm =
      existingOfficeUse?.officeInfo?.salesTeam?.[1]?.rmName?.id ?? closingRmId;

    const officeUsePayload: any = {
      opportunityId,
      officeInfo: existingOfficeUse?.officeInfo ?? {},
      closingRmId: closingRm,
    };

    // only add id if exists
    if (existingOfficeUse?.id) {
      officeUsePayload.id = existingOfficeUse.id;
    }

    await this.bookingOfficeUseRepository.upsert(officeUsePayload, [
      'opportunityId',
    ]);
  }

  async deleteDocument(documentId: number): Promise<any> {
    try {
      const found = await this.bookingDocumentsRepository.findOne({
        where: { id: documentId },
      });
      if (!found) throw new NotFoundException();

      await this.bookingDocumentsRepository.remove(found);
      return {
        statusCode: SUCCESS,
        message: 'Document deleted successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Failed to delete document:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to delete document: ${error?.message}`,
      );
    }
  }

  async markAsSigned(documentId: number): Promise<any> {
    try {
      const found = await this.bookingDocumentsRepository.findOne({
        where: { id: documentId },
      });
      if (!found) throw new NotFoundException();

      await this.bookingDocumentsRepository.update(
        { id: documentId },
        { isSigned: true },
      );
      return {
        statusCode: SUCCESS,
        message: 'Document signed successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Failed to update document:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to update document: ${error?.message}`,
      );
    }
  }

  /**
   * Fetch booking documents using voucherId or opportunityId.
   * If linked voucher/opportunity records exist, fetch those documents as well.
   * Applies optional filters like type, stage, and signed status.
   */
  async getDocuments(
    id: string | number,
    type?: string | string[],
    stage?: string,
    isSigned?: boolean,
  ): Promise<any> {
    try {
      logger.info(`getDocuments service called: ${id}`);
      const whereCondition: any[] = [];

      const commonCondition: any = {};

      if (type) {
        commonCondition.type = Array.isArray(type) ? In(type) : type;
      }

      if (stage) {
        commonCondition.stage = stage;
      }

      if (isSigned !== undefined) {
        commonCondition.isSigned = isSigned;
      }

      if (typeof id === 'number') {
        whereCondition.push({
          ...commonCondition,
          voucherId: id,
        });

        // Find linked opportunityId from voucher table
        const voucher = await this.voucherRepository.findOne({
          where: { id },
          select: ['opportunityId'],
        });

        if (voucher?.opportunityId) {
          whereCondition.push({
            ...commonCondition,
            opportunityId: voucher.opportunityId,
          });
        }
      } else {
        whereCondition.push({
          ...commonCondition,
          opportunityId: id,
        });

        // Find linked voucherId from booking documents
        const booking = await this.booking.findOne({
          where: { opportunityId: id },
          select: ['voucherId'],
        });

        if (booking?.voucherId) {
          whereCondition.push({
            ...commonCondition,
            voucherId: booking.voucherId,
          });
        }
      }

      const found = await this.bookingDocumentsRepository.find({
        where: whereCondition,
        order: { id: 'ASC' },
      });

      return {
        statusCode: SUCCESS,
        message: 'Documents fetched successfully.',
        data: found,
      };
    } catch (error) {
      logger.error('Failed to get documents :', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get documents: ${error?.message}`,
      );
    }
  }

  async getOppWithDocuments(oppIds: string[]): Promise<any> {
    try {
      // Fetch document existence for given opportunity IDs in one query
      const documentRecords = await this.bookingDocumentsRepository
        .createQueryBuilder('doc')
        .select('doc.opportunityId', 'opportunityId')
        .where('doc.opportunityId IN (:...oppIds)', { oppIds })
        .distinct(true)
        .getRawMany();

      // Convert documentRecords to a Set for fast lookup
      const documentSet = new Set(
        documentRecords.map((doc) => doc.opportunityId),
      );

      return {
        statusCode: SUCCESS,
        message: 'Opp List fetched successfully.',
        data: documentSet,
      };
    } catch (error) {
      logger.error('Failed to get documents :', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get documents: ${error?.message}`,
      );
    }
  }
}
