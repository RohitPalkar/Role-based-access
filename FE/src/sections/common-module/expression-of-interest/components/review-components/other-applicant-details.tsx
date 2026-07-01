/* eslint-disable jsx-a11y/label-has-associated-control */
import "./CustomerPreview.scss";

import type { Voucher, VoucherResponse } from "src/types/rm-panel/eoi";

import React, { useState, useEffect } from "react";

import { formatDate } from "src/utils/helper";

import uiText from 'src/locales/langs/en/common.json';

import { applicantCountConstant } from "../../../../../utils/constant";

interface OtherApplicantDetailsProps {
  voucherData: VoucherResponse;
}

const OtherApplicantDetails = ({ voucherData } : OtherApplicantDetailsProps) => {
  const [voucherList, setVoucherList] = useState<Voucher[]>([]);
  const previewText = uiText.eoiPreview.applicantDetails;
  
  useEffect(() => {
    const obj = [];
    if (voucherData && voucherData?.applicant3 !== null) {
      obj.push(voucherData?.applicant3);
    }
    if (voucherData && voucherData?.applicant4 !== null) {
      obj.push(voucherData?.applicant4);
    }
    setVoucherList(obj);
  }, [voucherData]);

  return (
    <>
      {voucherList &&
        voucherList?.length > 0 &&
        voucherList.map((data, index) => (
            <div
              key={data?.opportunityId}
              className={`otherApplicantDetails applicant${index + 3}`}
            >
              <div className="applicantDetailsCard">
                <div className="editTitleRow">
                  <div className="btnApplicantTop">
                    {index + 3}
                    <sup>
                      {applicantCountConstant.numberKeys[(index + 3) as 1 | 2 | 3 | 4]}
                    </sup>{" "}
                    {previewText.title}
                  </div>
                </div>

                <div className="personalInformation marginBottom0">
                  <div className="informationDetails">
                    {/* <h2 className="name">{`${
                      data?.personalDetails?.firstName
                    }${" "}${data?.personalDetails?.lastName}`}</h2> */}
                    <h3 className="titlePersonalHD">{previewText.personalDetails}</h3>
                    <div className="personalInfo width40">
                      <div className="personalInfoRow">
                        <label className="label150">{previewText.firstName}:</label>
                        <span>
                          {`${data?.personalDetails?.firstName}` || "N/A"}
                        </span>
                      </div>
                      <div className="personalInfoRow">
                        <label className="label150">{previewText.lastName}:</label>
                        <span>
                          {`${data?.personalDetails?.lastName}` || "N/A"}
                        </span>
                      </div>
                      <div className="personalInfoRow">
                        <label className="label150">{previewText.contactNo}</label>
                        <span>
                          {`${data?.contactDetails?.countryCode}${data?.contactDetails?.contactNumber}` ||
                            "N/A"}
                        </span>
                      </div>
                       <div className="personalInfoRow">
                        <label className="label150">{previewText.dob}:</label>
                        <span>  {data?.personalDetails?.dob  ? formatDate(data.personalDetails.dob)  : "N/A"}</span>
                      </div>
                      <div className="personalInfoRow">
                        <label className="label150">{previewText.email}:</label>
                        <span>
                          {data?.contactDetails?.emailAddress || "N/A"}
                        </span>
                      </div>
                      {data?.contactDetails?.panNumber !== null &&
                      data?.contactDetails?.panNumber?.length > 0 ? (
                        <div className="personalInfoRow">
                          <label className="label150">{previewText.panNumber}:</label>
                          <span>
                            {data?.contactDetails?.panNumber || "N/A"}
                          </span>
                        </div>
                      ) : null}
                      {data?.contactDetails?.aadhaarNumber !== null &&
                      data?.contactDetails?.aadhaarNumber?.length > 0 ? (
                        <div className="personalInfoRow">
                          <label className="label150">{previewText.aadhaarNumber}:</label>
                          <span>
                            {data?.contactDetails?.aadhaarNumber || "N/A"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
    </>
  );
};

export default OtherApplicantDetails;
