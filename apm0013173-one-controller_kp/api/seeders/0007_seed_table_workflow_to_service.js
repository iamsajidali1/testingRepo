
/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_TO_SERVICE', [


        {
            ID: 1,
            WORKFLOW_ID: 1,
            SERVICE_ID: 1
        },
        {
            ID: 2,
            WORKFLOW_ID: 2,
            SERVICE_ID: 1
        },
        {
            ID: 3,
            WORKFLOW_ID: 3,
            SERVICE_ID: 1
        },
        {
            ID: 4,
            WORKFLOW_ID: 4,
            SERVICE_ID: 1
        },
        {
            ID: 5,
            WORKFLOW_ID: 5,
            SERVICE_ID: 1
        },
        {
            ID: 6,
            WORKFLOW_ID: 6,
            SERVICE_ID: 1
        },
        {
            ID: 7,
            WORKFLOW_ID: 7,
            SERVICE_ID: 3
        },
        {
            ID: 8,
            WORKFLOW_ID: 8,
            SERVICE_ID: 3
        },
        {
            ID: 9,
            WORKFLOW_ID: 9,
            SERVICE_ID: 3
        },
        {
            ID: 16,
            WORKFLOW_ID: 10,
            SERVICE_ID: 3
        }
    ], {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        'CSS_ROLES', {
        ID: { [Sequelize.Op.lte]: 3 }
    }, {}
    );
}


module.exports = { up, down };
