import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingReconciliationToRmDashboard1765347760805 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP procedure IF EXISTS rm_dashboard_listing;`);

    await queryRunner.query(`
CREATE DEFINER=\`purvankara\`@\`%\` PROCEDURE \`rm_dashboard_listing\`(IN input JSON)
rm_dashboard_listing: BEGIN 

    DECLARE pageNumber, fixedLimit, offsetValue, totalCountOfCampaign INT DEFAULT 0;
    DECLARE view, orderByColumn, orderDir VARCHAR(255);
    DECLARE viewBy,campaignIdArr,voucherIdArr JSON DEFAULT JSON_ARRAY();
    DECLARE data JSON DEFAULT JSON_ARRAY();
    DECLARE campaignId VARCHAR(50);
DECLARE unitType,startDate, endDate VARCHAR(255);
DECLARE skipPagination boolean default false; 

    -- Disable ONLY_FULL_GROUP_BY for JSON aggregation
    SET SESSION sql_mode = (SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));

    -- Extract inputs
    SET view = JSON_UNQUOTE(JSON_EXTRACT(input, '$.view'));
    SET pageNumber = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.page')), 1);
    SET fixedLimit = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.limit')), 10);
    SET offsetValue = (pageNumber - 1) * fixedLimit;
    SET viewBy = IFNULL(JSON_EXTRACT(input, '$.viewBy'), JSON_ARRAY('unit'));
    SET orderByColumn = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.sort_column')), '');
    SET orderDir = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.sort_order')), 'DESC');
    SET skipPagination = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.skipPagination')), false);

    -- Validation
    IF(view IS NULL OR view = '' OR view = 'undefined') THEN
        SELECT JSON_OBJECT('status', 'FAILURE', 'status_code', 400, 'message', 'Bad request. Required field tab is empty!') AS resp;
        LEAVE rm_dashboard_listing;
    END IF;

    -- Get total campaign count
    SET campaignId = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.campaignId')),'');
SET unitType = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.unitType')),'');
SET startDate = IFNULL((JSON_EXTRACT(input, '$.startDate')),'');
SET endDate = IFNULL((JSON_EXTRACT(input, '$.endDate')),'');

-- Start building base query
SET @totalCountOfCampaign=0;
SET @campaignIdArr = JSON_ARRAY();
SET @voucherIdArr = JSON_ARRAY();
SET @baseVoucherQuery = ' SELECT 
        IFNULL(JSON_ARRAYAGG(t.campaignId), JSON_ARRAY()) INTO @voucherIdArr FROM (SELECT v.id as CampaignId
    
    FROM eoi_campaigns ec 
    LEFT JOIN vouchers v ON v.campaign_id = ec.id
    WHERE 1=1 AND v.campaign_id is not null AND ec.status IN ("Active | Voucher","Active | EOI","Active | Voucher to EOI") AND (v.id IS NULL OR v.is_deleted = 0)';
SET @baseSql = '
   SELECT 
        IFNULL(JSON_ARRAYAGG(t.campaignId), JSON_ARRAY()) INTO @campaignIdArr FROM (SELECT ec.id as CampaignId
    
    FROM eoi_campaigns ec 
    LEFT JOIN vouchers v ON v.campaign_id = ec.id
    WHERE 1=1 AND v.campaign_id is not null AND ec.status IN ("Active | Voucher","Active | EOI","Active | Voucher to EOI") AND (v.id IS NULL OR v.is_deleted = 0)
';

-- Dynamically add filters
IF (campaignId IS NOT NULL AND campaignId <> '') THEN
    SET @baseSql = CONCAT(@baseSql, ' AND ec.id = ', campaignId);
    SET @baseVoucherQuery = CONCAT(@baseVoucherQuery, ' AND ec.id = ', campaignId);
END IF;

IF (unitType IS NOT NULL AND unitType <> '') THEN
    SET @baseSql = CONCAT(@baseSql, ' AND IFNULL(JSON_UNQUOTE(JSON_EXTRACT(v.eoi_details, "$.typology")), "") = ', QUOTE(unitType));
    SET @baseVoucherQuery = CONCAT(@baseVoucherQuery, ' AND IFNULL(JSON_UNQUOTE(JSON_EXTRACT(v.eoi_details, "$.typology")), "") = ', QUOTE(unitType));
END IF;

IF (startDate IS NOT NULL AND startDate <> '' AND endDate IS NOT NULL AND endDate <> '') THEN
    -- Both start and end dates
    SET @baseSql = CONCAT(
        @baseSql, 
        ' AND DATE(v.created_at) >= ', (startDate), ' AND  DATE(v.created_at) <= ', (endDate)
    );
    SET @baseVoucherQuery = CONCAT(
        @baseVoucherQuery, 
        ' AND DATE(v.created_at) >= ', (startDate), ' AND  DATE(v.created_at) <= ', (endDate)
    );
ELSEIF (startDate IS NOT NULL AND startDate <> '') THEN
    -- Only start date provided
    SET @baseSql = CONCAT(
        @baseSql, 
        ' AND DATE(v.created_at) >= ', (startDate)
    );
    SET @baseVoucherQuery = CONCAT(
        @baseVoucherQuery, 
        ' AND DATE(v.created_at) >= ', (startDate)
    );
ELSEIF (endDate IS NOT NULL AND endDate <> '') THEN
    -- Only end date provided
    SET @baseSql = CONCAT(
        @baseSql, 
        ' AND DATE(v.created_at) <= ', (endDate)
    );
    SET @baseVoucherQuery = CONCAT(
        @baseVoucherQuery, 
        ' AND DATE(v.created_at) <= ', (endDate)
    );
    
END IF;
SET @baseSql = CONCAT(@baseSql,'  group by ec.id) as t');
SET @baseVoucherQuery = CONCAT(@baseVoucherQuery,'  group by v.id) as t');
-- Execute dynamically and store count
PREPARE stmt FROM @baseSql;
EXECUTE stmt ;
DEALLOCATE PREPARE stmt;
SET campaignIdArr = IFNULL(@campaignIdArr, JSON_ARRAY());
SET totalCountOfCampaign = JSON_LENGTH(campaignIdArr);

IF totalCountOFCampaign = 0 THEN
	    SELECT JSON_OBJECT(
        'totalcount', totalCountOfCampaign,
        'page', pageNumber,
        'limit', fixedLimit,
        'data', IFNULL(data, JSON_ARRAY())
    ) AS resp;
    leave rm_dashboard_listing;
    END IF;
PREPARE stmt FROM @baseVoucherQuery;
EXECUTE stmt ;
DEALLOCATE PREPARE stmt;

SET voucherIdArr = IFNULL(@voucherIdArr, JSON_ARRAY());

-- Convert JSON array of IDs to a comma-separated string for WHERE IN
SET @campaignIdList = (
    SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
    FROM JSON_TABLE(campaignIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
);
SET @voucherIdList = (
    SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
    FROM JSON_TABLE(voucherIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
);
SET @viewByList = (
    SELECT CONCAT('JSON_ARRAY(', GROUP_CONCAT(CONCAT('"', JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')), '"')), ')')
    FROM JSON_TABLE(viewBy, '$[*]' COLUMNS(value JSON PATH '$')) AS c
);
-- Handle edge case: empty array (avoid syntax errors)
IF @campaignIdList IS NULL OR @campaignIdList = '' THEN
    SET @campaignIdList = 'NULL';
END IF;

SET @limitQuery = '';
        IF(skipPagination = false) THEN
          SET @limitQuery=  CONCAT (' LIMIT ', fixedLimit, ' OFFSET ', offsetValue);
        END IF;
    -- ===============================
    -- DEFAULT VIEW
    -- ===============================
    IF(view = 'default') THEN
        
        -- Map UI sort columns to DB columns
        SET @orderColumnDB = CASE orderByColumn
            WHEN 'collectedEoiCount' THEN 'collectedEoiCount'
            WHEN 'totalEoiAmount' THEN 'totalEoiAmount'
            WHEN 'totalEoiAmountCollected' THEN 'totalEoiAmountCollected'
            ELSE 'ec.id'
        END;

        -- Build the SQL
        SET @sql = CONCAT(
            'SELECT JSON_ARRAYAGG(JSON_OBJECT(
                "campaignId", t.campaignId,
                "campaign", t.campaign,
                "collectedEoiCount", t.collectedEoiCount,
                "inProgressEoiCount",t.inProgressEoiCount,
                "activeEoiCount",t.activeEoiCount,
                "totalEoiAmount", t.totalEoiAmount,
                "totalEoiAmountCollected", t.totalEoiAmountCollected,
                "allotedIdCount", t.allotedIdCount,
                "pendingMISCount", t.pendingMISCount,
                "pendingCRMCount", t.pendingCRMCount,
                "pendingFINCount", t.pendingFINCount,
                "pendingRMCount", t.pendingRMCount,
                "pendingReconciliation", t.pendingReconciliation,
                "cancellationCount", JSON_OBJECT(
                    "totalCount", IFNULL(t.requested,0)+IFNULL(t.processed,0)+IFNULL(t.inProgress,0),
                    "requested", t.requested,
                    "processed", t.processed,
                    "inProgress", t.inProgress
                )
            )) INTO @data
            FROM (
                SELECT 
                    ec.id AS campaignId,
                    ec.campaign_name AS campaign,
                    SUM(v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid", "Partially Paid"))) AS collectedEoiCount,
                    SUM(v.voucher_status IN("2-Form fill in progress") AND (v.payment_status NOT IN ("Paid", "Partially Paid"))) AS inProgressEoiCount,
                    SUM(v.voucher_status ="10-Active") AS activeEoiCount,
    SUM(
        CASE 
            WHEN (v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid", "Partially Paid"))) 
            THEN IFNULL(JSON_EXTRACT(v.payment_details, "$.amountPayable"), 0)
            ELSE 0
        END
    ) AS totalEoiAmount,
    SUM(
        CASE 
            WHEN (v.voucher_status NOT IN("1-Form Link Shared") AND v.payment_status IN ("Paid", "Partially Paid")) 
            THEN IFNULL(JSON_EXTRACT(v.payment_details, "$.totalAmountPaid"), 0)
            ELSE 0
        END
    ) AS totalEoiAmountCollected,
                    SUM(v.queue_id IS NOT NULL) AS allotedIdCount,
                    SUM(v.voucher_status IN ("3-Form Submitted","5-MIS-Resubmission requested","6-Updated as per MIS")) AS pendingMISCount,
                    SUM(v.voucher_status IN ("4-MIS Verified","8-CRM-Resubmission requested","9-Updated as per CRM")) AS pendingCRMCount,
                    SUM(v.voucher_status IN( "7-CRM Verified","4-MIS Verified","8-CRM-Resubmission requested","9-Updated as per CRM")) AS pendingFINCount,
                    SUM(
                    ((v.voucher_status IN ("5-MIS-Resubmission requested","8-CRM-Resubmission requested","3-Form Submitted","9-Updated as per CRM","6-Updated as per MIS"))
                     OR (v.finance_status IN("Rejected", "Not Realized")) OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid", "Partially Paid")))) AS pendingRMCount,
                    SUM((v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid", "Partially Paid"))) AND v.voucher_status != "10-Active") AS pendingReconciliation,
                    SUM(v.voucher_status = "15-Cancellation Requested") AS requested,
                    SUM(v.voucher_status = "19-Cancelled") AS processed,
                    SUM(v.voucher_status IN ("16-Cancellation Request Accepted","17-Cancellation Approved","18-Refund Initiated")) AS inProgress
                FROM eoi_campaigns ec
                LEFT JOIN vouchers v ON v.campaign_id = ec.id
                WHERE  ec.id IN (', @campaignIdList, ') AND v.id IN (' , @voucherIdList,' ) AND v.is_deleted = 0
                GROUP BY ec.id
                ORDER BY ', @orderColumnDB, ' ', orderDir, @limitQuery,'
            ) AS t;'
        );
        -- Run dynamic query
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET data = @data;

    -- ===============================
    -- OTHER VIEWS (e.g. channel partner, loyalty, etc.)
    -- ===============================
    ELSE
    SET @orderColumnDB = CASE orderByColumn
            WHEN 'collectedEoiCount' THEN 'collectedEoiCount'
            WHEN 'totalEoiAmount' THEN 'totalEoiAmount'
            WHEN 'totalEoiAmountCollected' THEN 'totalEoiAmountCollected'
            ELSE 'ec.id'
        END;
        SET @sql = CONCAT(
    'SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            "campaignId", t.campaignId,
            "campaign", t.campaign,
            "collectedEoiCount", t.collectedEoiCount,
            "inProgressEoiCount",t.inProgressEoiCount,
            "activeEoiCount",t.activeEoiCount,
            "totalEoiAmount", t.totalEoiAmount,
            "totalEoiAmountCollected", t.totalEoiAmountCollected,
            "pendingReconciliation", t.pendingReconciliation,
            "channelPartner", CONCAT_WS(" | ",
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("unit")),
        CONCAT(t.channelpartner, " unit(s)"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("percentage")),
        CONCAT(ROUND((t.channelpartner / NULLIF(t.collectedEoiCount,0)) * 100, 2), "%"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI value")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.total_channelpartner, 2)))), NULL),
IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI Amount Collected")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.paid_channelpartner, 2)))), NULL)
),

"loyalty", CONCAT_WS(" | ",
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("unit")),
        CONCAT(t.loyalty, " unit(s)"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("percentage")),
        CONCAT(ROUND((t.loyalty / NULLIF(t.collectedEoiCount,0)) * 100, 2), "%"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI value")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.total_loyalty, 2)))), NULL),
IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI Amount Collected")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.paid_loyalty, 2)))), NULL)
),

"digital", CONCAT_WS(" | ",
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("unit")),
        CONCAT(t.digital, " unit(s)"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("percentage")),
        CONCAT(ROUND((t.digital / NULLIF(t.collectedEoiCount,0)) * 100, 2), "%"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI value")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.total_digital, 2)))), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI Amount Collected")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.paid_digital, 2)))), NULL)

),

"direct", CONCAT_WS(" | ",
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("unit")),
        CONCAT(t.direct, " unit(s)"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("percentage")),
        CONCAT(ROUND((t.direct / NULLIF(t.collectedEoiCount,0)) * 100, 2), "%"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI value")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.total_direct, 2)))), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI Amount Collected")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.paid_direct, 2)))), NULL)

),

"purvaChampion", CONCAT_WS(" | ",
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("unit")),
        CONCAT(t.purvaChampion, " unit(s)"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("percentage")),
        CONCAT(ROUND((t.purvaChampion / NULLIF(t.collectedEoiCount,0)) * 100, 2), "%"), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI value")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.total_purvaChampion, 2)))), NULL),
    IF(JSON_CONTAINS(',@viewByList,', JSON_QUOTE("EOI Amount Collected")),
    CONCAT("₹ ", (SELECT format_indian_amount(ROUND(t.paid_purvaChampion, 2)))), NULL)

)

        )
    ) INTO @data
    FROM (
        SELECT 
            ec.id AS campaignId,
            ec.campaign_name AS campaign,
            SUM((v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid", "Partially Paid")))) AS collectedEoiCount,
            SUM(v.voucher_status IN("2-Form fill in progress") AND (v.payment_status NOT IN ("Paid", "Partially Paid"))) AS inProgressEoiCount,
            SUM(v.voucher_status ="10-Active") AS activeEoiCount,
            SUM(
        CASE 
            WHEN (v.voucher_status NOT IN ("1-Form Link Shared","2-Form fill in progress") OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid","Partially Paid")))
            THEN IFNULL(JSON_EXTRACT(v.payment_details, "$.amountPayable"), 0)
            ELSE 0
        END
    ) AS totalEoiAmount,
    SUM(
        CASE 
            WHEN (v.voucher_status NOT IN("1-Form Link Shared") AND v.payment_status IN ("Paid", "Partially Paid")) 
            THEN IFNULL(JSON_EXTRACT(v.payment_details, "$.totalAmountPaid"), 0)
            ELSE 0
        END
    ) AS totalEoiAmountCollected,
            SUM((v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") OR (v.voucher_status = "2-Form fill in progress" AND v.payment_status IN ("Paid", "Partially Paid"))) AND v.voucher_status != "10-Active") AS pendingReconciliation,
            SUM(v.primary_source = "Channel Partner" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")) AS channelpartner,
            SUM(v.primary_source IN ("Purva Privilege", "Provident Premier") AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")) AS loyalty,
            SUM(v.primary_source = "Digital Marketing" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")) AS digital,
            SUM(v.primary_source = "Direct Walk-in" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")) AS direct,
            SUM(v.primary_source = "Purva Champion" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")) AS purvaChampion,
            SUM(CASE WHEN v.primary_source = "Channel Partner" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")  THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.amountPayable"),0) ELSE 0 END) AS total_channelpartner,
            SUM(CASE WHEN v.primary_source IN ("Purva Privilege","Provident Premier") AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress")  THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.amountPayable"),0) ELSE 0 END) AS total_loyalty,
            SUM(CASE WHEN v.primary_source = "Digital Marketing" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.amountPayable"),0) ELSE 0 END) AS total_digital,
            SUM(CASE WHEN v.primary_source = "Direct Walk-in" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.amountPayable"),0) ELSE 0 END) AS total_direct,
            SUM(CASE WHEN v.primary_source = "Purva Champion" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.amountPayable"),0) ELSE 0 END) AS total_purvaChampion,
            SUM(CASE WHEN v.primary_source = "Channel Partner" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.totalAmountPaid"),0) ELSE 0 END) AS paid_channelpartner,
            SUM(CASE WHEN v.primary_source IN ("Purva Privilege","Provident Premier") AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.totalAmountPaid"),0) ELSE 0 END) AS paid_loyalty,
            SUM(CASE WHEN v.primary_source = "Digital Marketing" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.totalAmountPaid"),0) ELSE 0 END) AS paid_digital,
            SUM(CASE WHEN v.primary_source = "Direct Walk-in" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.totalAmountPaid"),0) ELSE 0 END) AS paid_direct,
            SUM(CASE WHEN v.primary_source = "Purva Champion" AND v.voucher_status NOT IN("1-Form Link Shared","2-Form fill in progress") THEN IFNULL(JSON_EXTRACT(v.payment_details,"$.totalAmountPaid"),0) ELSE 0 END) AS paid_purvaChampion
        FROM eoi_campaigns ec
        LEFT JOIN vouchers v ON v.campaign_id = ec.id
        WHERE ec.id IN (', @campaignIdList, ') AND v.id IN (' , @voucherIdList,' ) AND v.is_deleted = 0
        GROUP BY ec.id
        ORDER BY ', @orderColumnDB, ' ', orderDir,
        @limitQuery, ' 
    ) AS t;'
);

        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET data = @data;

    END IF;

    -- Final unified response
    SELECT JSON_OBJECT(
        'totalcount', totalCountOfCampaign,
        'page', pageNumber,
        'limit', fixedLimit,
        'data', IFNULL(data, JSON_ARRAY())
    ) AS resp;

END
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP procedure IF EXISTS rm_dashboard_listing;`);
  }
}
