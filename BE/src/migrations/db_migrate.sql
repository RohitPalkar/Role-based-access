CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  opportunityId VARCHAR(50) UNIQUE NOT NULL,
  enquiryId VARCHAR(50) NOT NULL,
  noOfApplicants INTEGER NOT NULL,
  fillingAs INTEGER NOT NULL,
  relationBtApplicants VARCHAR(50),
  lastStep INTEGER NOT NULL,
  isCompleted BOOLEAN DEFAULT FALSE,
  isAgreedOnTerms INTEGER,
  rating INTEGER,
  feedback TEXT,
  applicant1 JSON,
  applicant2 JSON,
  applicant3 JSON,
  applicant4 JSON,
  paymentDetails JSON,
  unitDetails JSON,
  otherDetails JSON,
  referrerDetails JSON,
  leegalityData JSON,
  unsignedPdf TEXT,
  signedPdf TEXT,
  bookingFormStatus VARCHAR(50) DEFAULT 'IN_PROGRESS',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_oppid ON bookings (opportunityId);
CREATE TABLE project_terms (
  id SERIAL PRIMARY KEY,
  projectName VARCHAR(50) NOT NULL,
  brandName VARCHAR(50) NOT NULL,
  brandLogo VARCHAR(255),
  city VARCHAR(50),
  termsConditions TEXT NOT NULL
);

CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  fullName VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  countryCode VARCHAR(10) NOT NULL,
  mobileNumber VARCHAR(20) NOT NULL,
  opportunityId VARCHAR(50) NOT NULL,
  primarySource VARCHAR(50) NOT NULL,
  secondarySource VARCHAR(100) DEFAULT 'Referral at booking',
  projectName VARCHAR(50),
  referredApartment VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_requests (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(100),
  user_agent TEXT,
  request_url TEXT,
  method VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bookings ADD COLUMN stepsCompleted JSON NULL;
ALTER TABLE referrals ADD CONSTRAINT unique_opportunity_mobile UNIQUE (opportunityId, mobileNumber);

ALTER TABLE bookings MODIFY COLUMN enquiryId VARCHAR(255) NULL;
ALTER TABLE referrals ADD COLUMN projectCity VARCHAR(100) NULL;

CREATE TABLE sfdc_logs (
  id INT NOT NULL AUTO_INCREMENT,
  opportunity_id VARCHAR(255) NOT NULL,
  payload JSON DEFAULT NULL,
  response JSON DEFAULT NULL,
  status VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  modified_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY idx_unique_opportunity_status (opportunity_id, status)
);
-- ALTER TABLE sfdc_logs DROP CONSTRAINT idx_unique_opportunity_status;
-- ALTER TABLE sfdc_logs ADD CONSTRAINT idx_unique_opportunity_status UNIQUE (opportunity_id, log_event, status);

ALTER TABLE sfdc_logs ADD COLUMN log_event VARCHAR(50) NULL;
ALTER TABLE bookings ADD COLUMN isEOIBooking BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN formFilledAt TIMESTAMP DEFAULT NULL;
-- ALTER TABLE bookings ADD COLUMN comments TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN documentsNote TEXT DEFAULT NULL;
-- ALTER TABLE bookings ADD COLUMN officeUse JSON NULL;
ALTER TABLE project_terms ADD COLUMN logoImage VARCHAR(255) DEFAULT NULL;
-- ALTER TABLE bookings DROP COLUMN bookingDocuments;

ALTER TABLE bookings ADD UNIQUE KEY (opportunityId);
ALTER TABLE bookings ADD INDEX (opportunityId);

CREATE TABLE booking_documents (
  id SERIAL PRIMARY KEY,
  opportunity_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  stage VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE bookings ADD COLUMN mergedPdf VARCHAR(255) DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN officeUsePdf VARCHAR(255) DEFAULT NULL;
ALTER TABLE booking_documents ADD COLUMN is_other_doc BOOLEAN DEFAULT FALSE;

CREATE TABLE booking_office_use (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opportunity_id VARCHAR(255) NOT NULL UNIQUE,
  office_use JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
ALTER TABLE booking_office_use ADD COLUMN primary_source_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN primary_source_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN formSignedAt TIMESTAMP DEFAULT NULL;

CREATE TABLE form_amendment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id VARCHAR(255) NOT NULL,
    form_type ENUM('booking', 'referral') NOT NULL,
    reason TEXT NOT NULL,
    requested_by INT NOT NULL,
    form_status_at_request VARCHAR(50) NOT NULL,
    needs_approval BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Indexes for better performance
    INDEX idx_form_type_id (form_type, opportunity_id)
);

ALTER TABLE users ADD COLUMN signature_image VARCHAR(255) DEFAULT NULL;

CREATE DEFINER=`purvankara`@`%` PROCEDURE `get_incentive_summary`(
    IN userIdsJson JSON,
    IN fyStart DATE,
    IN fyEnd DATE,
    IN lastMonth DATE,
    IN lastMonthEnd DATE
)
BEGIN
  -- Drop temp table if it exists
  DROP TEMPORARY TABLE IF EXISTS temp_user_ids;
  CREATE TEMPORARY TABLE temp_user_ids (userId INT);

  -- Insert from JSON array to temp table
  INSERT INTO temp_user_ids (userId)
  SELECT CAST(jt.value AS UNSIGNED)
  FROM JSON_TABLE(userIdsJson, '$[*]' COLUMNS (value INT PATH '$')) AS jt;

  -- Main query
  SELECT
    booking.user_id AS userId,

    SUM(CASE
          WHEN booking.payable_received_date BETWEEN lastMonth AND lastMonthEnd
               AND booking.payment_status = 'PAYABLE'
               AND booking.unit_status IN ('QUALIFIED', 'QUALIFIED_CANCELLED')
          THEN booking.incentive_amount
          ELSE 0
        END) AS incentivePayable,

    SUM(CASE
          WHEN booking.booking_date BETWEEN fyStart AND fyEnd
          THEN booking.gross_total_value
          ELSE 0
        END) AS bookingAmountYTD,

    SUM(CASE
          WHEN booking.booking_date BETWEEN fyStart AND fyEnd
          THEN booking.total_received
          ELSE 0
        END) AS collectedAmountYTD,

    COUNT(DISTINCT CASE
                     WHEN booking.booking_date BETWEEN fyStart AND fyEnd
                     THEN booking.id
                   END) AS totalBookings,

    COUNT(DISTINCT CASE
                     WHEN booking.unit_status IN ('QUALIFIED', 'QUALIFIED_CANCELLED')
                          AND booking.booking_date BETWEEN fyStart AND fyEnd
                     THEN booking.id
                   END) AS qualifiedBookings,

    COUNT(DISTINCT CASE
                     WHEN booking.unit_status = 'DISQUALIFIED'
                          AND booking.booking_date BETWEEN fyStart AND fyEnd
                     THEN booking.id
                   END) AS disqualifiedBookings,

    COUNT(DISTINCT CASE
                     WHEN booking.unit_status = 'CANCELLED'
                          AND booking.booking_date BETWEEN fyStart AND fyEnd
                     THEN booking.id
                   END) AS cancelledBookings,

    COUNT(DISTINCT CASE
                     WHEN booking.unit_status = 'REGULARIZED'
                          AND booking.booking_date BETWEEN fyStart AND fyEnd
                     THEN booking.id
                   END) AS regularisedBookings,

    COUNT(DISTINCT CASE
                     WHEN booking.unit_status = 'UNREGULARIZED'
                          AND booking.booking_date BETWEEN fyStart AND fyEnd
                     THEN booking.id
                   END) AS unRegularisedBookings

  FROM incentive_bookings AS booking
  WHERE booking.user_id IN (SELECT userId FROM temp_user_ids)
  GROUP BY booking.user_id;

  -- Cleanup
  DROP TEMPORARY TABLE IF EXISTS temp_user_ids;
END;

-- Migration: Create vouchers table
-- Date: 2025-08-06
-- Description: Create vouchers table for voucher/EOI management

CREATE TABLE vouchers (
  id INT NOT NULL AUTO_INCREMENT,
  voucher_id VARCHAR(255) NOT NULL,
  enquiry_id VARCHAR(255) DEFAULT NULL,
  no_of_applicants INT NOT NULL,
  filling_as INT NOT NULL,
  relation_bt_applicants VARCHAR(255) DEFAULT NULL,
  applicant1 JSON DEFAULT NULL,
  applicant2 JSON DEFAULT NULL,
  applicant3 JSON DEFAULT NULL,
  applicant4 JSON DEFAULT NULL,
  payment_details JSON DEFAULT NULL,
  unit_details JSON DEFAULT NULL,
  other_details JSON DEFAULT NULL,
  campaign_id INT DEFAULT NULL,
  voucher_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  lead_status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  queue_id VARCHAR(255) DEFAULT NULL,
  form_filled_at TIMESTAMP NULL DEFAULT NULL,
  voucher_claimed_at TIMESTAMP NULL DEFAULT NULL,
  claimed_booking_id VARCHAR(255) DEFAULT NULL,
  steps_completed JSON DEFAULT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  is_aggreed_on_terms TINYINT(1) DEFAULT NULL,
  last_step INT DEFAULT NULL,
  primary_source VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_voucher_id (voucher_id),
  KEY idx_enquiry_id (enquiry_id),
  KEY idx_voucher_status (voucher_status),
  KEY idx_payment_status (payment_status),
  KEY idx_lead_status (lead_status),
  KEY idx_project_id (campaign_id),
  KEY idx_created_at (created_at),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE vouchers
ADD COLUMN `created_by` INT NULL DEFAULT NULL AFTER `updated_at`;

-- Migration: Create eoi_campaigns table
-- Date: 2025-01-15
-- Description: Create eoi_campaigns table for EOI project management

CREATE TABLE eoi_campaigns (
  id INT NOT NULL AUTO_INCREMENT,
  campaign_name VARCHAR(255) NOT NULL,
  enquiry_initials VARCHAR(50) NOT NULL,
  voucher_start_date TIMESTAMP NOT NULL,
  voucher_end_date TIMESTAMP NOT NULL,
  vqi_counter INT NOT NULL DEFAULT 0,
  std_counter INT NOT NULL DEFAULT 0,
  pre_counter INT NOT NULL DEFAULT 0,
  enquiry_counter INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_name (campaign_name),
  KEY idx_enquiry_initials (enquiry_initials),
  KEY idx_voucher_dates (voucher_start_date, voucher_end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Update vouchers table foreign key reference
-- Date: 2025-01-15
-- Description: Update vouchers table to reference eoi_campaigns instead of projects

-- First, drop the existing foreign key constraint
ALTER TABLE vouchers DROP FOREIGN KEY vouchers_ibfk_1;

-- Update the foreign key to reference eoi_campaigns
ALTER TABLE vouchers
ADD CONSTRAINT fk_vouchers_eoi_project
FOREIGN KEY (campaign_id) REFERENCES eoi_campaigns(id) ON DELETE SET NULL;

ALTER TABLE vouchers
ADD COLUMN `eoi_details` JSON NULL DEFAULT NULL AFTER `created_by`;

ALTER TABLE vouchers
ADD COLUMN `secondary_source` VARCHAR(255) DEFAULT NULL AFTER `eoi_details`;

ALTER TABLE vouchers
ADD COLUMN `tertiary_source` VARCHAR(255) DEFAULT NULL AFTER `eoi_details`;

ALTER TABLE `puravankara_dev`.`vouchers`
ADD COLUMN `form_phase` ENUM('EOI', 'VOUCHER') NULL DEFAULT 'VOUCHER' AFTER `source_details`;

ALTER TABLE `puravankara_dev`.`eoi_campaigns`
ADD COLUMN `phase` ENUM('EOI', 'VOUCHER') NULL DEFAULT 'VOUCHER' AFTER `updated_at`;

-- Migration: Create channel_partners table
-- Date: 2025-08-06
-- Description: Create channel_partners table for channel partner management

CREATE TABLE channel_partners (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  contact_number VARCHAR(10) NULL DEFAULT NULL,
  country_code VARCHAR(5) NULL DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  rera VARCHAR(50) NULL DEFAULT NULL,
  gst VARCHAR(50) NULL DEFAULT NULL,
  region VARCHAR(50) NULL DEFAULT NULL,
  pan_number VARCHAR(10) NULL DEFAULT NULL,
  campaign_id INT NULL DEFAULT NULL,
  link VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NULL DEFAULT NULL,
  pin_code INT NULL DEFAULT NULL,
  created_by VARCHAR(255) NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_name_campaign (name, campaign_id),
  KEY idx_status (status),
  KEY idx_region (region),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


ALTER TABLE `puravankara_dev`.`channel_partners`
CHANGE COLUMN `pan_number` `pan_number` VARCHAR(10) NULL DEFAULT NULL,
CHANGE COLUMN `pin_code` `pin_code` VARCHAR(10) NULL DEFAULT NULL;

ALTER TABLE `puravankara_dev`.`vouchers`
CHANGE COLUMN `other_details` `source_details` JSON NULL DEFAULT NULL;

ALTER TABLE `puravankara_dev`.`vouchers`
ADD COLUMN `cp_link_id` VARCHAR(16) NULL DEFAULT NULL AFTER `tertiary_source`;

ALTER TABLE `puravankara_dev`.`channel_partners`
CHANGE COLUMN `link` `link_id` VARCHAR(16) NOT NULL ;

ALTER TABLE `puravankara_dev`.`vouchers`
DROP COLUMN `claimed_booking_id`,
DROP COLUMN `steps_completed`,
DROP COLUMN `relation_bt_applicants`,
DROP COLUMN `filling_as`,
CHANGE COLUMN `is_aggreed_on_terms` `is_agreed_on_terms` TINYINT(1) NULL DEFAULT NULL ;

ALTER TABLE `puravankara_dev`.`channel_partners`
ADD COLUMN `unit` VARCHAR(50) NULL DEFAULT NULL AFTER `updated_at`,
ADD COLUMN `country` VARCHAR(50) NULL DEFAULT NULL AFTER `unit`,
ADD COLUMN `state` VARCHAR(50) NULL DEFAULT NULL AFTER `country`;

ALTER TABLE `puravankara_dev`.`vouchers`
CHANGE COLUMN `cp_link_id` `cp_link_id` INT NULL DEFAULT NULL ;

ALTER TABLE `puravankara_dev.vouchers` ADD COLUMN submitted_at TIMESTAMP NULL DEFAULT NULL AFTER cp_link_id ;
ALTER TABLE `puravankara_dev`.`vouchers`
ADD COLUMN `customer_last_updated_at` DATE NULL DEFAULT NULL AFTER `cp_link_id`;

ALTER TABLE `puravankara_dev`.`vouchers`
ADD COLUMN `is_upgradable_to_eoi` TINYINT(1) NULL DEFAULT 0 AFTER `customer_last_updated_at`;

ALTER TABLE `puravankara_dev`.`vouchers`
CHANGE COLUMN `customer_last_updated_at` `customer_last_updated_at` TIMESTAMP NULL DEFAULT NULL ;
-- INSERT QUERY

INSERT INTO `sfdc_project_listing` VALUES (1,'Adora De Goa','Adora De Goa','[\"1 BHK\",\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(2,'Bayscape','Bayscape','[\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(3,'Botanico','Botanico','[\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(4,'Capella','Capella','[\"1 BHK\",\"2 BHK\",\"2.5 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(5,'Deansgate','Deansgate','[\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(6,'Ecopolitan','Ecopolitan','[\"3 BHK\",\" 3.5 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(7,'Equinox','Equinox','[\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(8,'Kenvista','Kenvista','[\"1 BHK\",\"2 BHK\",\"2.5 BHK\",\"4 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(9,'Kenworth','Kenworth','[\"1 BHK\",\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(10,'Palm Vista','Palm Vista','[\"1 BHK\",\"2 BHK\",\"2.5 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(11,'Park Square','Park Square','[\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,''),(13,'Sunworth City','Sunworth City','[\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(14,'Winworth','Winworth','[\"2.5 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(15,'Aspire','Aspire','[\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(16,'Atmosphere','Atmosphere','[\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1776'),(17,'Blubelle','Blubelle','[\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(18,'Clermont','Clermont','[\"2 BHK\",\"3 BHK \"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1773'),(19,'Clermont Commercial','Clermont Commercial','[\"\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(20,'Emerald Bay','Emerald Bay','[\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1773'),(21,'Marina One','MarinaOne','[\"3.5 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(22,'Meraki','Meraki','[\"3 BHK\",\"4 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(23,'Orient Grand','Orient Grand','[\"3 BHK\",\" 4 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(24,'Park Hill','Park Hill','[\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(26,'Purva Atmosphere Pune','Purva Atmosphere Pune','[\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(27,'Purva Panorama','Purva Panorama','[\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(28,'Silversands','Silversands','[\"2 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(29,'Somerset House','Somerset House','[\"3 BHK\",\"4 BHK\",\"5 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1773'),(30,'Sparkling Springs/Symphony','Sparkling Springs','[\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(31,'Windermere/Lakevista','Windermere','[\"1 BHK\",\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1773'),(32,'Zenium','Zenium','[\"2 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1773'),(33,'Zenium Phase II','Zenium Phase II','[\"2 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(34,'Zentech','Zentech','','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(35,'Oakshire','Oakshire','','Purva Land','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(37,'Raagam','Raagam','','Purva Land','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(38,'Soukhyam','Soukhyam','','Purva Land','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(39,'Tivoli Hills','Tivoli Hills','','Purva Land','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,NULL),(40,'Promenade','Promenade','[\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1434'),(41,'Palm Beach','Palm Beach','[\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1434'),(42,'Tree','Tree','[\"1 BHK\",\"2 BHK\",\"3 BHK\"]','Provident','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1434'),(43,'Green Park Apartments','Green Park Apartments','[\"1 BHK\",\"2 BHK\",\"3 BHK\"]','Puravankara','[\"Upto 35L\",\"40L - 50L\",\"50L - 60L\",\"60L - 70L\",\"70L - 80L\",\"80L - 90L\",\"90L - 1Cr\",\"1Cr - 1.5Cr\",\"1.5Cr - 2Cr\",\"2Cr - 2.5Cr\",\"2.5Cr - 3Cr\",\"3Cr - 4Cr\",\"4Cr - 5Cr\",\"5Cr - 7Cr\",\"7Cr and Above\"]',0,'1434');