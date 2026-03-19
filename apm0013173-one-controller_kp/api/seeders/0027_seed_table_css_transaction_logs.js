/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
    INSERT
    IGNORE INTO CSS_TRANSACTION_LOGS (ID, SESSION_ID, TRANSACTION_ID, CUSTOMER_ID, SERVICE_ID, SERVICE_TO_CUSTOMER_ID, ACTION_ID, HOSTNAME, VCO_DETAILS, DMS_SERVER, VENDOR_TYPE_ID, CHANGE_TYPE_ID, MCAP_CREDENTIAL_ID, STEP, STATUS, CONFIG_MCAP_ID, CONFIG_TEMPLATE_UUID, REQUESTER, CREATE_DATE, UPDATE_DATE)
    SELECT TR.ID AS ID,
        TR.SESSION_ID AS SESSION_ID,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.transactionId')) AS TRANSACTION_ID,
        (CASE
                WHEN EXISTS
                    (SELECT NULL
                        FROM css_customers customers
                        WHERE CAST(JSON_EXTRACT(TR.DATA, '$.customerId') AS unsigned) = customers.ID) THEN CAST(JSON_EXTRACT(TR.DATA, '$.customerId') AS unsigned)
                ELSE NULL
            END) AS CUSTOMER_ID,
        (CASE
                WHEN EXISTS
                    (SELECT NULL
                        FROM css_services services
                        WHERE CAST(JSON_EXTRACT(TR.DATA, '$.serviceId') AS unsigned) = services.ID) THEN CAST(JSON_EXTRACT(TR.DATA, '$.serviceId') AS unsigned)
                ELSE NULL
            END) AS SERVICE_ID,
        CAST(JSON_EXTRACT(TR.DATA, '$.serviceToCustomerId') AS unsigned) AS SERVICE_TO_CUSTOMER_ID,
        (CASE
                WHEN EXISTS
                    (SELECT NULL
                        FROM CSS_TEMPLATES templates
                        WHERE CAST(JSON_EXTRACT(TR.DATA, '$.actionId') AS unsigned) = templates.ID) THEN CAST(JSON_EXTRACT(TR.DATA, '$.actionId') AS unsigned)
                ELSE NULL
            END) AS ACTION_ID,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.hostname')) AS HOSTNAME,
        JSON_EXTRACT(TR.DATA, '$.vcoUrl') AS VCO_DETAILS,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.dms_server')) AS DMS_SERVER,
        (CASE
                WHEN EXISTS
                    (SELECT NULL
                        FROM css_conf_template_vendor_types vTypes
                        WHERE CAST(JSON_EXTRACT(TR.DATA, '$.deviceType') AS unsigned) = vTypes.ID) THEN CAST(JSON_EXTRACT(TR.DATA, '$.deviceType') AS unsigned)
                ELSE NULL
            END) AS VENDOR_TYPE_ID,
        (CASE
                WHEN EXISTS
                    (SELECT NULL
                        FROM css_workflow_to_template wTemplate
                        WHERE CAST(JSON_EXTRACT(TR.DATA, '$.workflowId') AS unsigned) = wTemplate.ID) THEN CAST(JSON_EXTRACT(TR.DATA, '$.workflowId') AS unsigned)
                ELSE NULL
            END) AS CHANGE_TYPE_ID,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.mcapCredentialId')) AS MCAP_CREDENTIAL_ID,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.step')) AS STEP,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.status')) AS STATUS,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.configurationMcapId')) AS CONFIG_MCAP_ID,
        JSON_UNQUOTE(JSON_EXTRACT(TR.DATA, '$.uuid')) AS CONFIG_TEMPLATE_UUID,
        TR.USER_ID AS REQUESTER,
        TR.CREATEDAT AS CREATE_DATE,
        TR.UPDATEDAT AS UPDATE_DATE
    FROM css_transaction TR;`);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`TRUNCATE TABLE CSS_TRANSACTION_LOGS;`);
}


module.exports = { up, down };
