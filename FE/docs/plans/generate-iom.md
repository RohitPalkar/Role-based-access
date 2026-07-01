Implement below with proper plan:
- We need to implement business logic for generate IOM.
- On page open of Generate IOM, call get IOM details API. Refer API response at the bottom.
- Open a form with below fields mapping from the API
    * Referrer Details (fetched from SAP API) - Readonly
    * Customer Name
    * Project Name and Location
    * BP Code
    * Unit Number and Booking Date
    * Referee Details (fetched from SAP API) - Readonly
    * Customer Name
    * Project Name and Location
    * BP Code
    * Unit Number and Booking Date
    * Payment Details (fetched from SAP API)
    * Basic Sale Price- editable
    * Brokerage % - editable
    * Brokerage Amount- calculated field non editable (basic sale price*Brokerage %)
    * Points Adjustment Type - Fetched from API if not present give dropdown
        * Payments details can be changed coming from the SAP API but it will not be pushed again
        * Points Adjustment Type options: 1:1, 2:0, 0:2, Other
        * On Other Selection, give 2 Inputs of “Points Ratio”
    * Points to Referrer (%) and Points to Referrer Amount - Readonly, calculate based on Brokerage Amount and Points Adjustment Type
    * Points to Referee (%) and Points to Referee Amount - Readonly, calculate based on Brokerage Amount and Points Adjustment Type
    * Show Approval Proof file upload when “Points Adjustment Type” is “Other”
    * When Basic Sale Price || Brokerage (%) || Points Adjustment Type are modified by the user then highlight the input fields. API will give flag for it.
    * CRM Signature (Initially all blank)
    * Prepared By (Name and signature)
    * Verified By (Name and signature)
    * Approved By (Name and signature)
    * Business Exception- display points adjustment type other than 1:1. Refer label format in the figma.
    * Approval from Finance (Initially all blank)
    * Approval 1 (Name and signature)
    * Approval 2 (Name and signature)
    * Show Sources in SAP section.

- Currently, IOM has below statuses
IOM to be created
IOM Created
IOM Edited
TL Approved 
TL Rejected 
CRM Head Approved
CRM Head Rejected
Finance Verified 
Finance Rejected
Finance Approver Approved
Finance Head Rejected
Points to be uploaded
Points Uploaded
Invoice requested from vendor
Invoice Submited to Finance
Invoice Rejected by Finance
IOM Closed

- In the IOM flow, currently we have below roles who can access the Generate IOM:
   - CRM = 'CRM'
- Generate IOM page to be displayed only to the user with role CRM
- Generate IOM will be editable only when status of IOM is one of below:
	- IOM to be created
	- TL Rejected
	- CRM Head Rejected
	- Finance Rejected
	- Finance Head Rejected
	- Invoice Rejected by Finance

Business Logic for Generate IOM (refer figma designs):
- Payment Details will be auto fetched from view API
	- Basic Sale Price, Brokerage %, Points adjustment Type and Points Ratio, Approval Proof will be editable fields.
	- Points adjustment Type have below options, define enum for it for now:
		- "1:1"
		- "2:0"
		- "0:2"
		- Other
	- When Other option selected then enable Points ratio inputs where user can enter custom values. Allow values till 5% only and allow 1 decimal. eg 1.5 & 0.5.
	- When option 1:1 or 2:0 or 0:2 selected then points ratio will be disabled with selected option values. eg 2:0 selected then inputs will show 2 and 0.
	- Based on Basic Sale Price, Brokerage % and Points adjustment type, we need to calculate Brokerage amount, Points to referrer %, Points referrer amount, points to referee % and Points referee amount.
	- When other is selected then only Approval proof is required. otherwise it should be hidden.
	- The Approval proof should accept images and pdfs. show helper text below for supported file extensions. On View proof click, open file in the new tab.
	- Approval proof can be deleted by CRM role only and delete CTA will be visible only when IOM is in one of above status.
	- Show Cancel and Submit for Approval button. Buttons will be visible only when IOM is in one of above status.
	- On Submit for approval click, show common confirmation popup. Upon confirm, call generate IOM API (consider request and response mock for now).
	- For API calling and state management, refer exisiting patterns followed in the project. Do not generate any new pattern.
    - For APIs, for now consider MOCK endpoints

	Get IOM Details API Response:
	{
    "success": true,
    "response": {
        "statusCode": 200,
        "message": "IOM details fetched successfully.",
        "data": [
      {
        referer_details: {
          customer_name: 'Ganesh G',
          project_name: 'Project A',
          project_location: 'Location 1',
          unit_number: 'A1024',
          bp_code: 'BP-210923',
          booking_date: '12/05/2026',
        },
        referee_details: {
          customer_name: 'John Doe',
          project_name: 'Project B',
          project_location: 'Location 12',
          unit_number: 'A10299',
          bp_code: 'BP-210978',
          booking_date: '11/07/2026',
        },
        payment_details: {
          basic_sale_price: 12000000,
          brokerage: '2',
          brokerage_amt: '240000',
          total_amt: '12240000',
          points_adjustment_type: '1:1',
          pts_to_referer:1,
          pts_to_referee:1,
          pts_referer_amount:120000,
          pts_referee_amount:120000,
        },
        sap_source: 'Purva Privilege',
        sfdc_source: 'Purva Privilege',
        agreement_date: 11/01/25,
        refer_paid:80,
        referee_paid:80
      },
    ]
    },
    "errors": null
}