/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, DataTypes) {
    return queryInterface.sequelize.query(`create or replace
    algorithm = UNDEFINED view CSS_SR_REPORTS_VIEW as
    select
        tr.ID as ID,
        json_unquote(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.transactionId')) as TRANSACTION_ID,
        cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.customerId') as unsigned) as CUSTOMER_ID,
        customer.NAME as CUSTOMER_NAME,
        customer.BC_COMPANY_ID as BC_CUSTOMER_ID,
        cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.serviceId') as unsigned) as SERVICE_ID,
        service.SERVICE_NAME as SERVICE_NAME,
        cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.serviceToCustomerId') as unsigned) as SERVICETOCUSTOMER_ID,
        cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.actionId') as unsigned) as ACTION_ID,
        template.NAME as ACTION_NAME,
        json_unquote(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.hostname')) as hostname,
        cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.workflowId') as unsigned) as CHANGE_TYPE_ID,
        workflow.ID as WORKFLOW_ID,
        workflow.NAME as CHANGE_TYPE,
        tr.USER_ID as REQUESTER,
        tr.createdAt as CREATE_DATE,
        tr.updatedAt as UPDATE_DATE
    from
        (((((css_transaction tr
    join css_customers customer on
        ((customer.ID = cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.customerId') as unsigned))))
    join css_services service on
        ((service.ID = cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.serviceId') as unsigned))))
    join css_templates template on
        ((template.ID = cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.actionId') as unsigned))))
    join css_workflow_to_template workflowtemplate on
        ((workflowtemplate.ID = cast(json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.workflowId') as unsigned))))
    join css_workflow workflow on
        ((workflow.ID = workflowtemplate.WORKFLOW_ID)))
    where
        ((json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.transactionId') is not null)
        and (json_extract(convert(cast(tr.DATA as char charset binary)
            using latin1), '$.status') in ('Rollback', 'Confirm')))
    order by
        tr.createdAt desc
    `);
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
