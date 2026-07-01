import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEoiLeaderboardListingSp1768304314637 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP procedure IF EXISTS eoi_leaderboard_listing;`,
    );

    await queryRunner.query(`
CREATE PROCEDURE eoi_leaderboard_listing(IN input JSON)
eoi_leaderboard_listing: BEGIN 

    DECLARE pageNumber, fixedLimit, offsetValue, totalCount INT DEFAULT 0;
    DECLARE view, sortBy VARCHAR(255);
    DECLARE startDate, endDate VARCHAR(255);
    DECLARE campaignIdArr, channelPartnerIdArr, rmIdArr, userGroupIdArr JSON DEFAULT JSON_ARRAY();
    DECLARE data JSON DEFAULT JSON_ARRAY();
    DECLARE sortColumn VARCHAR(100) DEFAULT 'noOfVouchers';
    DECLARE cancellationStatusesStr VARCHAR(500) DEFAULT "'14-Cancelled – Not realised','19-Cancelled'";
    DECLARE activeStatusesStr VARCHAR(200) DEFAULT "'Active | Voucher','Active | EOI','Active | Voucher to EOI'";
    DECLARE backtick CHAR(1) DEFAULT CHAR(96);

    -- Disable ONLY_FULL_GROUP_BY for JSON aggregation
    SET SESSION sql_mode = (SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));

    -- Extract inputs
    SET view = JSON_UNQUOTE(JSON_EXTRACT(input, '$.view'));
    SET pageNumber = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.page')), 1);
    SET fixedLimit = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.limit')), 10);
    SET offsetValue = (pageNumber - 1) * fixedLimit;
    SET sortBy = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.sortBy')), 'noOfVouchers');
    SET startDate = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.startDate')), '');
    SET endDate = IFNULL(JSON_UNQUOTE(JSON_EXTRACT(input, '$.endDate')), '');
    SET campaignIdArr = IFNULL(JSON_EXTRACT(input, '$.campaignId'), JSON_ARRAY());
    SET channelPartnerIdArr = IFNULL(JSON_EXTRACT(input, '$.channelPartnerId'), JSON_ARRAY());
    SET rmIdArr = IFNULL(JSON_EXTRACT(input, '$.rmId'), JSON_ARRAY());
    SET userGroupIdArr = IFNULL(JSON_EXTRACT(input, '$.userGroupId'), JSON_ARRAY());

    -- Map sortBy to column name
    SET sortColumn = CASE sortBy
        WHEN 'noOfVouchers' THEN 'noOfVouchers'
        WHEN 'voucherValue' THEN 'voucherValue'
        WHEN 'amountCollected' THEN 'amountCollected'
        ELSE 'noOfVouchers'
    END;

    -- Validation
    IF(view IS NULL OR view = '' OR view = 'undefined') THEN
        SELECT JSON_OBJECT('status', 'FAILURE', 'status_code', 400, 'message', 'Bad request. Required field view is empty!') AS resp;
        LEAVE eoi_leaderboard_listing;
    END IF;

    -- ===============================
    -- CHANNEL PARTNER VIEW
    -- ===============================
    IF(view = 'channelPartner') THEN
        
        -- Build WHERE conditions
        SET @whereConditions = 'v.is_deleted = false AND v.cp_link_id IS NOT NULL';
        
        -- Date range filter
        IF (startDate IS NOT NULL AND startDate <> '' AND endDate IS NOT NULL AND endDate <> '') THEN
            SET @whereConditions = CONCAT(@whereConditions, ' AND DATE(v.created_at) >= ', QUOTE(startDate), ' AND DATE(v.created_at) <= ', QUOTE(endDate));
        END IF;
        
        -- Campaign filter
        IF (JSON_LENGTH(campaignIdArr) > 0) THEN
            SET @campaignIdList = (
                SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
                FROM JSON_TABLE(campaignIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
            );
            IF (@campaignIdList IS NOT NULL AND @campaignIdList <> '') THEN
                SET @whereConditions = CONCAT(@whereConditions, ' AND ec.id IN (', @campaignIdList, ')');
            END IF;
        ELSE
            -- Apply active campaign status filter only when campaignId is NOT provided
            SET @whereConditions = CONCAT(@whereConditions, ' AND ec.status IN (', activeStatusesStr, ')');
        END IF;
        
        -- Channel Partner filter
        IF (JSON_LENGTH(channelPartnerIdArr) > 0) THEN
            SET @cpIdList = (
                SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
                FROM JSON_TABLE(channelPartnerIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
            );
            IF (@cpIdList IS NOT NULL AND @cpIdList <> '') THEN
                SET @whereConditions = CONCAT(@whereConditions, ' AND cp.id IN (', @cpIdList, ')');
            END IF;
        END IF;

        -- Voucher status filter: exclude CREATED and IN_PROGRESS (except IN_PROGRESS with paid status)
        -- Note: Cancellation statuses are NOT filtered out here so they can be counted in cancellations metric
        SET @whereConditions = CONCAT(@whereConditions, ' AND (v.voucher_status NOT IN (''1-Form Link Shared'', ''2-Form fill in progress'') OR (v.voucher_status = ''2-Form fill in progress'' AND v.payment_status IN (''Paid'', ''Partially Paid'')) OR v.voucher_status IN (', cancellationStatusesStr, '))');

        -- Build main query
        SET @sql = CONCAT(
            'SELECT JSON_ARRAYAGG(JSON_OBJECT(
                "cpId", t.cpId,
                "cpName", t.cpName,
                "channelPartnerType", t.channelPartnerType,
                "campaignId", t.campaignId,
                "campaignName", t.campaignName,
                "noOfVouchers", t.noOfVouchers,
                "voucherValue", t.voucherValue,
                "amountCollected", t.amountCollected,
                "cancellations", t.cancellations,
                "createdByName", t.createdByName,
                "lastCollectedDate", t.lastCollectedDate
            )) INTO @data
            FROM (
                SELECT 
                    cp.id AS cpId,
                    cp.cp_name AS cpName,
                    cp.cp_type AS channelPartnerType,
                    ec.id AS campaignId,
                    ec.campaign_name AS campaignName,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status NOT IN (', cancellationStatusesStr, ')
                        OR (v.finance_status = ''Rejected'' AND v.payment_status = ''Partially Paid'')
                        THEN v.id
                        ELSE NULL
                    END) AS noOfVouchers,
                    IFNULL(SUM(CASE
                        WHEN v.voucher_status NOT IN (', cancellationStatusesStr, ')
                        OR (v.finance_status = ''Rejected'' AND v.payment_status = ''Partially Paid'')
                        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(v.payment_details, "$.amountPayable")) AS DECIMAL(15,2))
                        ELSE 0
                    END), 0) AS voucherValue,
                    IFNULL(SUM(CASE
                        WHEN v.voucher_status NOT IN (', cancellationStatusesStr, ')
                        OR (v.finance_status = ''Rejected'' AND v.payment_status = ''Partially Paid'')
                        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(v.payment_details, "$.totalAmountPaid")) AS DECIMAL(15,2))
                        ELSE 0
                    END), 0) AS amountCollected,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status = ''19-Cancelled''
                        THEN v.id
                        ELSE NULL
                    END) AS cancellations,
                    MAX(createdBy.name) AS createdByName,
                    MAX(v.created_at) AS lastCollectedDate
                FROM vouchers v
                INNER JOIN channel_partners cp ON v.cp_link_id = cp.id
                INNER JOIN eoi_campaigns ec ON v.campaign_id = ec.id
                LEFT JOIN users createdBy ON v.created_by = createdBy.id
                WHERE ', @whereConditions, '
                GROUP BY cp.id, ec.id
                ORDER BY ', sortColumn, ' DESC, noOfVouchers DESC
                LIMIT ', fixedLimit, ' OFFSET ', offsetValue, '
            ) AS t;'
        );
        
        -- Execute query
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET data = IFNULL(@data, JSON_ARRAY());
        
        -- Get total count
        SET @countSql = CONCAT(
            'SELECT COUNT(*) INTO @totalCount
            FROM (
                SELECT cp.id AS cpId, ec.id AS campaignId
                FROM vouchers v
                INNER JOIN channel_partners cp ON v.cp_link_id = cp.id
                INNER JOIN eoi_campaigns ec ON v.campaign_id = ec.id
                WHERE ', @whereConditions, '
                GROUP BY cp.id, ec.id
            ) AS t;'
        );
        
        PREPARE countStmt FROM @countSql;
        EXECUTE countStmt;
        DEALLOCATE PREPARE countStmt;
        
        SET totalCount = IFNULL(@totalCount, 0);

    -- ===============================
    -- RELATIONSHIP MANAGER VIEW
    -- ===============================
    ELSEIF(view = 'relationshipManager') THEN
        
        -- Set backtick-wrapped table name for groups (reserved keyword)
        SET @groupsTable = CONCAT(CHAR(96), 'groups', CHAR(96));
        
        -- Build WHERE conditions
        SET @whereConditions = 'v.is_deleted = false AND v.created_by IS NOT NULL';
        
        -- Date range filter
        IF (startDate IS NOT NULL AND startDate <> '' AND endDate IS NOT NULL AND endDate <> '') THEN
            SET @whereConditions = CONCAT(@whereConditions, ' AND DATE(v.created_at) >= ', QUOTE(startDate), ' AND DATE(v.created_at) <= ', QUOTE(endDate));
        END IF;
        
        -- Campaign filter
        IF (JSON_LENGTH(campaignIdArr) > 0) THEN
            SET @campaignIdList = (
                SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
                FROM JSON_TABLE(campaignIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
            );
            IF (@campaignIdList IS NOT NULL AND @campaignIdList <> '') THEN
                SET @whereConditions = CONCAT(@whereConditions, ' AND ec.id IN (', @campaignIdList, ')');
            END IF;
        ELSE
            -- Apply active campaign status filter only when campaignId is NOT provided
            SET @whereConditions = CONCAT(@whereConditions, ' AND ec.status IN (', activeStatusesStr, ')');
        END IF;
        
        -- RM filter
        IF (JSON_LENGTH(rmIdArr) > 0) THEN
            SET @rmIdList = (
                SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
                FROM JSON_TABLE(rmIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
            );
            IF (@rmIdList IS NOT NULL AND @rmIdList <> '') THEN
                SET @whereConditions = CONCAT(@whereConditions, ' AND rm.id IN (', @rmIdList, ')');
            END IF;
        END IF;
        
        -- User Group filter
        IF (JSON_LENGTH(userGroupIdArr) > 0) THEN
            SET @userGroupIdList = (
                SELECT GROUP_CONCAT(JSON_UNQUOTE(JSON_EXTRACT(c.value, '$')))
                FROM JSON_TABLE(userGroupIdArr, '$[*]' COLUMNS(value JSON PATH '$')) AS c
            );
            IF (@userGroupIdList IS NOT NULL AND @userGroupIdList <> '') THEN
                SET @whereConditions = CONCAT(@whereConditions, ' AND userGroup.id IN (', @userGroupIdList, ')');
            END IF;
        END IF;

        -- Note: We do NOT filter out '1-Form Link Shared' and '2-Form fill in progress' vouchers here
        -- because we need to count them in formFillingInProgress and formLinksShared metrics.
        -- The main metrics (noOfVouchers, voucherValue, amountCollected) exclude them via CASE statements in SELECT.

        -- Build main query
        SET @sql = CONCAT(
            'SELECT JSON_ARRAYAGG(JSON_OBJECT(
                "rmId", t.rmId,
                "rmName", t.rmName,
                "campaignId", t.campaignId,
                "campaignName", t.campaignName,
                "noOfVouchers", t.noOfVouchers,
                "voucherValue", t.voucherValue,
                "amountCollected", t.amountCollected,
                "formFillingInProgress", t.formFillingInProgress,
                "formLinksShared", t.formLinksShared,
                "cancellations", t.cancellations,
                "converted", t.converted,
                "userGroup", t.userGroup,
                "lastCollectedDate", t.lastCollectedDate
            )) INTO @data
            FROM (
                SELECT 
                    rm.id AS rmId,
                    rm.name AS rmName,
                    ec.id AS campaignId,
                    ec.campaign_name AS campaignName,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status NOT IN (''1-Form Link Shared'', ''2-Form fill in progress'', ', cancellationStatusesStr, ')
                        OR (v.voucher_status = ''2-Form fill in progress'' AND v.payment_status IN (''Paid'', ''Partially Paid''))
                        OR (v.finance_status = ''Rejected'' AND v.payment_status = ''Partially Paid'')
                        THEN v.id
                        ELSE NULL
                    END) AS noOfVouchers,
                    IFNULL(SUM(CASE
                        WHEN v.voucher_status NOT IN (''1-Form Link Shared'', ''2-Form fill in progress'', ', cancellationStatusesStr, ')
                        OR (v.voucher_status = ''2-Form fill in progress'' AND v.payment_status IN (''Paid'', ''Partially Paid''))
                        OR (v.finance_status = ''Rejected'' AND v.payment_status = ''Partially Paid'')
                        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(v.payment_details, "$.amountPayable")) AS DECIMAL(15,2))
                        ELSE 0
                    END), 0) AS voucherValue,
                    IFNULL(SUM(CASE
                        WHEN v.voucher_status NOT IN (''1-Form Link Shared'', ''2-Form fill in progress'', ', cancellationStatusesStr, ')
                        OR (v.voucher_status = ''2-Form fill in progress'' AND v.payment_status IN (''Paid'', ''Partially Paid''))
                        OR (v.finance_status = ''Rejected'' AND v.payment_status = ''Partially Paid'')
                        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(v.payment_details, "$.totalAmountPaid")) AS DECIMAL(15,2))
                        ELSE 0
                    END), 0) AS amountCollected,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status = "2-Form fill in progress"
                        THEN v.id
                        ELSE NULL
                    END) AS formFillingInProgress,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status = "1-Form Link Shared"
                        THEN v.id
                        ELSE NULL
                    END) AS formLinksShared,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status = ''19-Cancelled''
                        THEN v.id
                        ELSE NULL
                    END) AS cancellations,
                    COUNT(DISTINCT CASE
                        WHEN v.voucher_status = "13-Converted"
                        THEN v.id
                        ELSE NULL
                    END) AS converted,
                    userGroup.name AS userGroup,
                    MAX(v.created_at) AS lastCollectedDate
                FROM vouchers v
                INNER JOIN users rm ON v.created_by = rm.id
                INNER JOIN eoi_campaigns ec ON v.campaign_id = ec.id
                LEFT JOIN ', @groupsTable, ' userGroup ON rm.group_id = userGroup.id
                WHERE ', @whereConditions, '
                GROUP BY rm.id, ec.id, userGroup.id
                ORDER BY ', sortColumn, ' DESC, noOfVouchers DESC
                LIMIT ', fixedLimit, ' OFFSET ', offsetValue, '
            ) AS t;'
        );
        
        -- Execute query
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET data = IFNULL(@data, JSON_ARRAY());
        
        -- Get total count
        SET @countSql = CONCAT(
            'SELECT COUNT(*) INTO @totalCount
            FROM (
                SELECT rm.id AS rmId, ec.id AS campaignId, userGroup.id AS userGroupId
                FROM vouchers v
                INNER JOIN users rm ON v.created_by = rm.id
                INNER JOIN eoi_campaigns ec ON v.campaign_id = ec.id
                LEFT JOIN ', @groupsTable, ' userGroup ON rm.group_id = userGroup.id
                WHERE ', @whereConditions, '
                GROUP BY rm.id, ec.id, userGroup.id
            ) AS t;'
        );
        
        PREPARE countStmt FROM @countSql;
        EXECUTE countStmt;
        DEALLOCATE PREPARE countStmt;
        
        SET totalCount = IFNULL(@totalCount, 0);
    END IF;

    -- Final unified response
    SELECT JSON_OBJECT(
        'data', IFNULL(data, JSON_ARRAY()),
        'total', totalCount,
        'page', pageNumber,
        'limit', fixedLimit,
        'pageCount', IF(totalCount > 0, CEIL(totalCount / fixedLimit), 0)
    ) AS resp;

END;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP procedure IF EXISTS eoi_leaderboard_listing;`,
    );
  }
}
