
/**
 * @param {import("sequelize").QueryInterface} queryInterface 
 * @param {import("sequelize").DataTypes} Sequelize 
 */
 function up(queryInterface, DataTypes) {
    return queryInterface.sequelize.query(`
        CREATE VIEW CSS_TRANSACTION_LOGS_VIEW AS
        SELECT
            tr.ID as ID, 
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.transactionId") as TRANSACTION_ID, 
            tr.SESSION_ID as SESSION_ID, 
            CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.customerId") AS UNSIGNED ) as CUSTOMER_ID,
            customer.NAME as CUSTOMER_NAME,
            customer.BC_COMPANY_ID as BC_CUSTOMER_ID,
            CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.serviceId") AS UNSIGNED ) as SERVICE_ID,
            service.SERVICE_NAME as SERVICE_NAME, 
            CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.serviceToCustomerId") AS UNSIGNED ) as SERVICETOCUSTOMER_ID,
            CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.actionId") AS UNSIGNED ) as ACTION_ID, 
            template.NAME as ACTION_NAME, 
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.hostname") as HOSTNAME,
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.dms_server") as DMS_SERVER,
            CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.deviceType") AS UNSIGNED ) as VENDOR_TYPE_ID,
            vendor.VENDOR_TYPE as VENDOR_TYPE,
            CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.workflowId") AS UNSIGNED ) as CHANGE_TYPE_ID,
            workflow.NAME as CHANGE_TYPE,
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.mcapCredentialId") as MCAP_CREDENTIAL_ID,
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.step") as STEP,
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.status") as STATUS,
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.configurationMcapId") as CONFIG_MCAP_ID,
            JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.uuid") as CONFIG_TEMPLATE_UUID,
            JSON_EXTRACT(CONVERT(CAST(template.CARCHETEMPLATE as BINARY) USING latin1), "$.id") as CONFIG_TEMPLATE_ID,
            JSON_EXTRACT(CONVERT(CAST(template.CARCHETEMPLATE as BINARY) USING latin1), "$.name") as CONFIG_TEMPLATE_NAME,
            tr.USER_ID as REQUESTER,
            tr.createdAt as CREATE_DATE,
            tr.updatedAt as UPDATE_DATE
        FROM css_transaction tr
            INNER JOIN css_customers as customer on customer.ID = CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.customerId") AS UNSIGNED )
            INNER JOIN css_services as service on service.ID = CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.serviceId") AS UNSIGNED )
            LEFT JOIN css_templates as template on template.ID = CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.actionId") AS UNSIGNED )
            LEFT JOIN css_conf_template_vendor_types as vendor on vendor.ID = CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.deviceType") AS UNSIGNED )
            LEFT JOIN css_workflow_to_template as workflowTemplate on workflowTemplate.ID = CAST(JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.workflowId") AS UNSIGNED ) 
            LEFT JOIN css_workflow as workflow on workflow.ID = workflowTemplate.WORKFLOW_ID
            LEFT JOIN css_carche_generated_config as gen_config on gen_config.TEMPLATE_UUID = JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.uuid")
        WHERE JSON_EXTRACT(CONVERT(CAST(tr.DATA as BINARY) USING latin1), "$.transactionId") IS NOT NULL
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
