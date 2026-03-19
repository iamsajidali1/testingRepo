/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`DROP TRIGGER CSS_INSERT_TRANSACTION_LOG_TRIGGER;`);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
    CREATE TRIGGER CSS_INSERT_TRANSACTION_LOG_TRIGGER
    AFTER
    INSERT ON CSS_TRANSACTION FOR EACH ROW BEGIN
    INSERT INTO CSS_TRANSACTION_LOGS (
            ID,
            SESSION_ID,
            TRANSACTION_ID,
            CUSTOMER_ID,
            SERVICE_ID,
            SERVICE_TO_CUSTOMER_ID,
            ACTION_ID,
            HOSTNAME,
            VCO_DETAILS,
            DMS_SERVER,
            VENDOR_TYPE_ID,
            CHANGE_TYPE_ID,
            MCAP_CREDENTIAL_ID,
            STEP,
            STATUS,
            CONFIG_MCAP_ID,
            CONFIG_TEMPLATE_UUID,
            REQUESTER,
            CREATE_DATE,
            UPDATE_DATE
        )
    VALUES(
            NEW.ID,
            NEW.SESSION_ID,
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.transactionId')),
            CAST(
                JSON_EXTRACT(NEW.DATA, '$.customerId') AS unsigned
            ),
            CAST(
                JSON_EXTRACT(NEW.DATA, '$.serviceId') AS unsigned
            ),
            CAST(
                JSON_EXTRACT(NEW.DATA, '$.serviceToCustomerId') AS unsigned
            ),
            CAST(
                JSON_EXTRACT(NEW.DATA, '$.actionId') AS unsigned
            ),
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.hostname')),
            JSON_EXTRACT(NEW.DATA, '$.vcoUrl'),
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.dms_server')),
            CAST(
                JSON_EXTRACT(NEW.DATA, '$.deviceType') AS unsigned
            ),
            CAST(
                JSON_EXTRACT(NEW.DATA, '$.workflowId') AS unsigned
            ),
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.mcapCredentialId')),
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.step')),
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.status')),
            JSON_UNQUOTE(
                JSON_EXTRACT(NEW.DATA, '$.configurationMcapId')
            ),
            JSON_UNQUOTE(JSON_EXTRACT(NEW.DATA, '$.uuid')),
            NEW.USER_ID,
            NEW.CREATEDAT,
            NEW.UPDATEDAT
        );
    END;`);
}

module.exports = { up, down };
