/* eslint-disable jsx-a11y/label-has-associated-control */
import "./CustomerPreview.scss";

import type { Voucher, VoucherResponse } from "src/types/rm-panel/eoi";

import React, { useState, useEffect } from "react";

import { formatDate } from "src/utils/helper";

import { CONFIG } from "src/config-global";
import uiText from 'src/locales/langs/en/common.json';

import dummyProfileImg from "../../../../../assets/images/dummy_profile.jpeg";
import {
  RESIDENT_STATUS,
  applicantCountConstant
} from "../../../../../utils/constant";

interface ApplicantDetailsProps {
  voucherData: VoucherResponse;
}

const formatAddress = (address: any) => {
  if (!address) return "N/A";
  
  const houseNumber = address.houseNumber || "";
  const areaName = address.areaName || "";
  const city = address.city || "";
  const state = address.state || "";
  const country = address.country || "";
  const pinCode = address.pinCode || "";

  if (areaName.includes(String(pinCode))) {
    return `${houseNumber}, ${areaName}`;
  }

  let formatted = `${houseNumber}, ${areaName}, ${city}, ${state}, ${country}`;
  if (pinCode) {
    formatted += `, ${pinCode}`;
  }
  return formatted;
};

const formatOfficeAddress = (address?: string, pinCode?: string) => {
  if (!address) return "N/A";
  if (pinCode && address.includes(pinCode)) {
    return address;
  }
  return pinCode ? `${address}, ${pinCode}` : address;
};

const ApplicantDetails = ({ voucherData } : ApplicantDetailsProps) => {
  const [voucherList, setVoucherList] = useState<Voucher[]>([]);
  const previewText = uiText.eoiPreview.applicantDetails;
  
  useEffect(() => {
    const obj = [];
    if (voucherData && voucherData?.applicant1 !== null) {
      obj.push(voucherData?.applicant1);
    }
    if (voucherData && voucherData?.applicant2 !== null) {
      obj.push(voucherData?.applicant2);
    }
    setVoucherList(obj);
  }, [voucherData]);

  return (
    <>
      {voucherList &&
        voucherList?.length > 0 &&
        voucherList?.map((data: Voucher, index: number) => (
            <div
              key={data?.opportunityId}
              className={`applicantDetailsCard applicant${index + 1}`}
            >
              <div className="editTitleRow">
                <div className="btnApplicantTop">
                  {index + 1 === 1 ? (
                    applicantCountConstant?.numberKeys[1]
                  ) : (
                    <>
                      {index + 1}
                      <sup>
                       {applicantCountConstant.numberKeys[(index + 1) as 1 | 2 | 3 | 4]}
                     </sup>
                    </>
                  )}{" "}
                  {previewText.title}
                </div>
              </div>

              <div className="personalInformation">
                <div className="photo">
                  {data?.personalDetails?.image?.length > 0 ? (
                    <img
                      src={`${`${CONFIG.site.s3BasePath 
                        }/${ 
                        data?.personalDetails?.image?.[0]}`
                        }`}
                      alt="User"
                    />
                  ) : (
                    <img src={`${dummyProfileImg}`} alt="User" />
                  )}
                </div>
                <div className="informationDetails">
                  <h2 className="name">{`${data?.personalDetails?.salutation} ${data?.personalDetails?.firstName
                    }${" "}${data?.personalDetails?.lastName}`}</h2>
                  <h3 className="relationOfApplicant">{data?.personalDetails?.relation || "Care of"}: {data?.personalDetails?.relativeName || "N/A"}</h3>
                  <h3 className="titlePersonalHD" style={{ marginBottom: '20px' }}>{previewText.personalDetails}</h3>
                  <div className="personalInfo width50">
                    <div className="personalInfoRow">
                      <label className="label150">{index + 1 === 1 ? previewText.primaryRegContactNo : previewText.contactNo}</label>
                      <span>
                        {typeof data?.personalDetails?.countryCode !== "undefined"
                          ? `${data?.personalDetails?.countryCode}${data?.personalDetails?.contactNumber}`
                          : "N/A"}
                      </span>
                    </div>
                    {data?.personalDetails?.alternateContactNumber &&
                      <div className="personalInfoRow">
                        <label className="label200">{previewText.altContactNo}: </label>&nbsp;
                        <span className="marginLeft30">
                          {typeof data?.personalDetails?.alternateCountryCode !== "undefined"
                            ? `${data?.personalDetails?.alternateCountryCode}${data?.personalDetails?.alternateContactNumber}`
                            : "N/A"}
                        </span>
                      </div>
                    }
                    <div className="personalInfoRow">
                      <label className="label150">{previewText.dob}:</label>
                      <span>{data?.personalDetails?.dob ? formatDate(data?.personalDetails?.dob) : "N/A"}</span>
                    </div> 
                    <div className="personalInfoRow">
                      <label className="label150">{previewText.email}:</label>
                        <span   
                          style={{
                          display: 'flex',
                          wordBreak: 'break-word', // Break long words
                          whiteSpace: 'normal', // Allow wrapping
                          maxWidth: '100%', // Ensure it respects container width
                        }} className="wordBreakMobile">
                          {data?.personalDetails?.emailAddress || "N/A"}
                        </span>
                    </div>           

                    <div className="personalInfoRow">
                      <label className="label150">{previewText.residentStatus}:</label>
                      <span>
                        {data?.personalDetails?.residentStatus || "N/A"}
                      </span>
                    </div>

                    {data?.personalDetails?.nriCountry && (
                      <div className="personalInfoRow">
                        <label className="label150">{previewText.nriCountry}:</label>
                        <span>
                          {data?.personalDetails?.nriCountry || "N/A"}
                        </span>
                      </div>
                    )}

                    <div className="personalInfoRow">
                      <label className="label150">{previewText.maritalStatus}:</label>
                      <span>
                        {data?.personalDetails?.maritalStatus || "N/A"}
                      </span>
                    </div>

                    <div className="personalInfoRow">
                      <label className="label150">{previewText.gender}:</label>
                      <span>{data?.personalDetails?.gender || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lineDotted" />
              <div className="personalInfo width50">
                {data?.contactDetails?.panNumber !== null &&
                  data?.contactDetails?.panNumber?.length > 0 ? (
                  <div className="personalInfoRow">
                    <label className="label180">{previewText.panNumber}:</label>
                    <span>{data?.contactDetails?.panNumber || "N/A"}</span>
                  </div>
                ) : null}
                {data?.contactDetails?.aadhaarNumber !== null &&
                  data?.contactDetails?.aadhaarNumber?.length > 0 ? (
                  <div className="personalInfoRow">
                    <label className="label180">{previewText.aadhaarNumber}:</label>
                    <span>{data?.contactDetails?.aadhaarNumber || "N/A"}</span>
                  </div>
                ) : null}

                {data?.personalDetails?.residentStatus !==
                  RESIDENT_STATUS?.Indian ? (
                  <>
                    {data?.contactDetails?.passportNumber !== null &&
                      data?.contactDetails?.passportNumber?.length > 0 ? (
                      <div className="personalInfoRow">
                        <label className="label180">{previewText.passportNumber}:</label>
                        <span>
                          {data?.contactDetails?.passportNumber || "N/A"}
                        </span>
                      </div>
                    ) : null}
                    {data?.contactDetails?.ociNumber !== null &&
                      data?.contactDetails?.ociNumber?.length > 0 ? (
                      <div className="personalInfoRow">
                        <label className="label180">{previewText.ociNumber}:</label>
                        <span>{data?.contactDetails?.ociNumber || "N/A"}</span>
                      </div>
                    ) : null}
                     {data?.contactDetails?.OCIAlternateDocType !== null &&
                      data?.contactDetails?.OCIAlternateDocType?.length > 0 ? (
                      <div className="personalInfoRow">

                        <label className="label180">{previewText.OCIAlternateDocType}:</label>

                        <span>{data?.contactDetails?.OCIAlternateDocType || "N/A"}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="notes">
                {previewText.note}
              </div>
              <div className="lineDotted" />

              <h3 className="titlePersonalHD marginBottom10">
                {previewText.communicationDetails}
              </h3>
              <div className="personalInfo Communication width50">
                {index !== 1 && (
                  <div className="personalInfoRow">
                    <label className="label200">{previewText.permanentAddress}:</label>
                    <span>
                      {formatAddress(data?.contactDetails?.permanentAddress)}
                    </span>
                  </div>
                )}
                <div className="personalInfoRow">
                  <label className="label200">{previewText.communicationAddress}:</label>
                  {index === 0 ? (
                    <span>
                      {formatAddress(data?.contactDetails?.communicationAddress)}
                    </span>
                  ) : (
                    <span>
                      {formatAddress(data?.contactDetails?.permanentAddress)}
                    </span>
                  )}
                </div>
              </div>
              <div className="lineDotted" />
              <h3 className="titlePersonalHD marginBottom10">
                {previewText.professionalDetails}
              </h3>
              <div className="personalInfo width50">
                {data?.professionalDetails?.occupation ? (
                  <div className="personalInfoRow">
                    <label  className="label200">{previewText.occupation}:</label>
                    <span style={{
                          display: 'flex',
                          wordBreak: 'break-word', // Break long words
                          whiteSpace: 'normal', // Allow wrapping
                          maxWidth: '100%', // Ensure it respects container width
                        }}>
                      
                      {data?.professionalDetails?.occupation || "N/A"}
                    </span>
                  </div>
                ) : null}

                {data?.professionalDetails?.industry && (
                    <div className="personalInfoRow">
                      <label className="label200">
                        {previewText.industry}:
                      </label>
                      <span>
                        {data?.professionalDetails?.industry ||
                          "N/A"}
                      </span>
                    </div>     
                  )}

                  {data?.professionalDetails?.companyName && (
                    <div className="personalInfoRow">
                        <label className="label200">
                          {previewText.companyName}:
                        </label>
                        <span>
                          {data?.professionalDetails?.companyName ||
                            "N/A"}
                        </span>
                      </div>
                  )}

                {data?.professionalDetails?.departmentDivision && (
                    <div className="personalInfoRow">
                      <label className="label200">
                        {previewText.departmentDivision}:
                      </label>
                      <span>
                        {data?.professionalDetails
                          ?.departmentDivision || "N/A"}
                      </span>
                    </div>
                  )}

                {data?.professionalDetails?.designationIfOthers && (
                    <div className="personalInfoRow">
                      <label className="label200">
                        {previewText.designation}:
                      </label>
                      <span>
                        {data?.professionalDetails
                          ?.designationIfOthers || "N/A"}
                      </span>
                    </div>
                  )}

                {data?.professionalDetails?.branch && (
                  <div className="personalInfoRow">
                    <label className="label200">
                      {previewText.branch}:
                    </label>
                    <span>
                      {data?.professionalDetails?.branch || "N/A"}
                    </span>
                  </div>
                )}

                {data?.professionalDetails?.rank && (
                  <div className="personalInfoRow">
                        <label className="label200">
                          {previewText.rank}:
                        </label>
                        <span>
                          {data?.professionalDetails?.rank || "N/A"}
                        </span>
                  </div>
                )}

                {data?.professionalDetails?.annualIncome ? (
                  <div className="personalInfoRow">
                    <label className="label200">
                      {previewText.annualIncome}:
                    </label>
                    <span>
                      {data?.professionalDetails?.annualIncome || "N/A"}
                    </span>
                  </div>
                ) : null}
              </div>

              {data?.professionalDetails?.companyAddress && (
                  <>
                    {data?.professionalDetails?.companyAddress && (
                      <div className="personalInfoRow">
                        <label className="label200">
                          {previewText.companyAddress}:
                        </label>
                        <span
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {data.professionalDetails.companyAddress.includes(
                            data?.professionalDetails?.companyPinCode ||
                            ""
                          )
                            ? data.professionalDetails.companyAddress
                            : `${data.professionalDetails.companyAddress
                            }${data?.professionalDetails
                              ?.companyPinCode
                              ? `, ${data.professionalDetails.companyPinCode}`
                              : ""
                            }`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              {data?.professionalDetails?.officeAddress && (
                  <>
                    {" "}
                    <div className="personalInfoRow">
                      <label className="label200">
                        {previewText.officeAddress}:
                      </label>
                      <span>
                        {formatOfficeAddress(
                          data?.professionalDetails?.officeAddress,
                          data?.professionalDetails?.officePinCode
                        )}
                      </span>
                    </div>
                  </>
                )}
            </div>
          ))}
    </>
  );
};

export default ApplicantDetails;
