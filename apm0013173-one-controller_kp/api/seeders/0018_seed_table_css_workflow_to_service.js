
/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_TO_SERVICE', [
        {
            WORKFLOW_ID: 1,
            SERVICE_ID: 4
        },
        {
            WORKFLOW_ID: 2,
            SERVICE_ID: 4
        },
        {
            WORKFLOW_ID: 3,
            SERVICE_ID: 4
        },
        {
            WORKFLOW_ID: 4,
            SERVICE_ID: 4
        },
        {
            WORKFLOW_ID: 6,
            SERVICE_ID: 4
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
        'CSS_WORKFLOW_TO_SERVICE', {
        SERVICE_ID: 4
    }, {}
    );
}


module.exports = { up, down };
