
/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_TO_SERVICE', [
        {
            WORKFLOW_ID: 12,
            SERVICE_ID: 1
        },
        {
            WORKFLOW_ID: 12,
            SERVICE_ID: 4
        },
        {
            WORKFLOW_ID: 12,
            SERVICE_ID: 2
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
        WORKFLOW_ID: 12
    }, {}
    );
}


module.exports = { up, down };