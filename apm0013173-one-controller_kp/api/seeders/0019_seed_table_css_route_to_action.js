/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ROUTE_TO_ACTION', [{
            ID: 97,
            METHOD: 'GET',
            ROUTE: '/logs/',
            ACTION_ID: null,
            SCHEDULER: false,
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
        ID: {
            [Sequelize.Op.in]: [97]
        }
    }, {}
    );
}


module.exports = { up, down };