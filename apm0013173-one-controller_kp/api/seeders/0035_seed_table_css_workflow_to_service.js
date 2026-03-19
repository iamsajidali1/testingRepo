/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function up(queryInterface) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_TO_SERVICE', [
        {
            WORKFLOW_ID: 14,
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
        'CSS_WORKFLOW_TO_SERVICE', {
            WORKFLOW_ID: {
            [Sequelize.Op.eq]: 14
        }
    }, {}
    );
}


module.exports = { up, down };