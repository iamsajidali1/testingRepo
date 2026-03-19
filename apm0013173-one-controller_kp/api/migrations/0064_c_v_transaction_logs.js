/**
 * @param {import("sequelize").QueryInterface} queryInterface 
 * @param {import("sequelize").DataTypes} Sequelize 
 */
 function up(queryInterface, DataTypes) {
    return queryInterface.sequelize.query(`
        CREATE OR REPLACE VIEW CSS_TRANSACTION_LOGS_VIEW AS
        SELECT 
            tr.ID AS ID,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.transactionId')) AS TRANSACTION_ID,
            tr.SESSION_ID AS SESSION_ID,
            CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                        '$.customerId')
                AS UNSIGNED) AS CUSTOMER_ID,
            customer.NAME AS CUSTOMER_NAME,
            customer.BC_COMPANY_ID AS BC_CUSTOMER_ID,
            CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                        '$.serviceId')
                AS UNSIGNED) AS SERVICE_ID,
            service.SERVICE_NAME AS SERVICE_NAME,
            CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                        '$.serviceToCustomerId')
                AS UNSIGNED) AS SERVICETOCUSTOMER_ID,
            CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                        '$.actionId')
                AS UNSIGNED) AS ACTION_ID,
            template.NAME AS ACTION_NAME,
            (CASE
                WHEN
                    (workflow.ID IN (7 , 8, 9, 10))
                THEN
                    JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                                                '$.vcoUrl')
                                        AS CHAR CHARSET BINARY) USING LATIN1),
                                    '$.url'))
                ELSE JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                                '$.hostname'))
            END) AS HOSTNAME,
            JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                    '$.vcoUrl') AS VCO,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.dms_server')) AS DMS_SERVER,
            CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                        '$.deviceType')
                AS UNSIGNED) AS VENDOR_TYPE_ID,
            vendor.VENDOR_TYPE AS VENDOR_TYPE,
            CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                        '$.workflowId')
                AS UNSIGNED) AS CHANGE_TYPE_ID,
            workflow.ID AS WORKFLOW_ID,
            workflow.NAME AS CHANGE_TYPE,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.mcapCredentialId')) AS MCAP_CREDENTIAL_ID,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.step')) AS STEP,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.status')) AS STATUS,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.configurationMcapId')) AS CONFIG_MCAP_ID,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.uuid')) AS CONFIG_TEMPLATE_UUID,
            JSON_EXTRACT(CONVERT( CAST(template.CARCHETEMPLATE AS CHAR CHARSET BINARY) USING LATIN1),
                    '$.id') AS CONFIG_TEMPLATE_ID,
            JSON_UNQUOTE(JSON_EXTRACT(CONVERT( CAST(template.CARCHETEMPLATE AS CHAR CHARSET BINARY) USING LATIN1),
                            '$.name')) AS CONFIG_TEMPLATE_NAME,
            tr.USER_ID AS REQUESTER,
            tr.createdAt AS CREATE_DATE,
            tr.updatedAt AS UPDATE_DATE
        FROM
            (((((((one.css_transaction tr
            JOIN one.css_customers customer ON ((customer.ID = CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1), '$.customerId')
                AS UNSIGNED))))
            JOIN one.css_services service ON ((service.ID = CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1), '$.serviceId')
                AS UNSIGNED))))
            LEFT JOIN one.css_templates template ON ((template.ID = CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1), '$.actionId')
                AS UNSIGNED))))
            LEFT JOIN one.css_conf_template_vendor_types vendor ON ((vendor.ID = CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1), '$.deviceType')
                AS UNSIGNED))))
            LEFT JOIN one.css_workflow_to_template workflowtemplate ON ((workflowtemplate.ID = CAST(JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1), '$.workflowId')
                AS UNSIGNED))))
            LEFT JOIN one.css_workflow workflow ON ((workflow.ID = workflowtemplate.WORKFLOW_ID)))
            LEFT JOIN one.css_carche_generated_config gen_config ON ((CONVERT( gen_config.TEMPLATE_UUID USING UTF8MB4) = JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1), '$.uuid'))))
        WHERE
            (JSON_EXTRACT(CONVERT( CAST(tr.DATA AS CHAR CHARSET BINARY) USING LATIN1),
                    '$.transactionId') IS NOT NULL)
        ORDER BY tr.createdAt DESC
    `);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface 
 * @param {import("sequelize").DataTypes} Sequelize 
 */
function down(queryInterface, DataTypes) {
    return queryInterface.sequelize.query(`
        DROP VIEW IF EXISTS CSS_TRANSACTION_LOGS_VIEW
    `);
}

module.exports = { up, down };
