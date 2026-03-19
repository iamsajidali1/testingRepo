/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, DataTypes) {
    return queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW CSS_SR_REPORTS_VIEW AS 
    SELECT
        tr.ID AS ID,
        json_unquote(json_extract(tr.DATA, '$.transactionId')) AS TRANSACTION_ID,
        cast(json_extract(tr.DATA, '$.customerId') AS unsigned) AS CUSTOMER_ID,
        customer.NAME AS CUSTOMER_NAME,
        customer.BC_COMPANY_ID AS BC_CUSTOMER_ID,
        cast(json_extract(tr.DATA, '$.serviceId') AS unsigned) AS SERVICE_ID,
        service.SERVICE_NAME AS SERVICE_NAME,
        cast(json_extract(tr.DATA, '$.serviceToCustomerId') AS unsigned) AS SERVICETOCUSTOMER_ID,
        cast(json_extract(tr.DATA, '$.actionId') AS unsigned) AS ACTION_ID,
        template.NAME AS ACTION_NAME,
        json_unquote(json_extract(tr.DATA, '$.hostname')) AS HOSTNAME,
        json_unquote(json_extract(tr.DATA, '$.dms_server')) AS DMS_SERVER,
        json_unquote(json_extract(tr.DATA, '$.status')) AS STATUS,
        cast(json_extract(tr.DATA, '$.workflowId') AS unsigned) AS CHANGE_TYPE_ID,
        workflow.ID AS WORKFLOW_ID,
        workflow.NAME AS CHANGE_TYPE,
        tr.USER_ID AS REQUESTER,
        tr.createdAt AS CREATE_DATE,
        tr.updatedAt AS UPDATE_DATE
    FROM (((((one.css_transaction tr
                        JOIN one.css_customers customer ON ((customer.ID = cast(json_extract(tr.DATA, '$.customerId') AS unsigned))))
                    JOIN one.css_services service ON ((service.ID = cast(json_extract(tr.DATA, '$.serviceId') AS unsigned))))
                JOIN one.css_templates TEMPLATE ON ((template.ID = cast(json_extract(tr.DATA, '$.actionId') AS unsigned))))
            JOIN one.css_workflow_to_template workflowtemplate ON ((workflowtemplate.ID = cast(json_extract(tr.DATA, '$.workflowId') AS unsigned))))
        JOIN one.css_workflow workflow ON ((workflow.ID = workflowtemplate.WORKFLOW_ID)))
    WHERE ((json_extract(tr.DATA, '$.transactionId') IS NOT NULL)
        and(json_unquote(json_extract(tr.DATA, '$.status'))
            in('Rollback', 'Confirm')))
    ORDER BY
        tr.createdAt DESC`);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, DataTypes) {
    return queryInterface.sequelize.query(`
        DROP VIEW IF EXISTS CSS_SR_REPORTS_VIEW
    `);
}

module.exports = { up, down };


