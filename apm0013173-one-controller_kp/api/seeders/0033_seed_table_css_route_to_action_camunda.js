/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ROUTE_TO_ACTION', [{
            ID: 99,
            METHOD: 'POST',
            ROUTE: '/camunda-task-handler/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: 'one'
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
        'CSS_ROUTE_TO_ACTION', {
        ID: { [Sequelize.Op.in]: [99] }
    }, {}
    );
}


module.exports = { up, down };