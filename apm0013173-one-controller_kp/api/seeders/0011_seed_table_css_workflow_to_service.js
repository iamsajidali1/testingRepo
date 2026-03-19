
/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_TO_SERVICE', [
        {
            ID: 17,
            WORKFLOW_ID: 11,
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
        ID: {
            [Sequelize.Op.in]: 17
        }
    }, {}
    );
}


module.exports = { up, down };
