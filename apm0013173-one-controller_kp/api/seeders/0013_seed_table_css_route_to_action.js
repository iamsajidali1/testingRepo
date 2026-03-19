/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ROUTE_TO_ACTION', [{
            ID: 88,
            METHOD: 'GET',
            ROUTE: '/service/attributes/',
            ACTION_ID: null,
            SCHEDULER: false,
            TYPE: 'one'
        },{
            ID: 89,
            METHOD: 'POST',
            ROUTE: '/service/attributes/',
            ACTION_ID: null,
            SCHEDULER: false,
            TYPE: 'one'
        }, {
            ID: 90,
            METHOD: 'DELETE',
            ROUTE: '/service/attributes/',
            ACTION_ID: null,
            SCHEDULER: false,
            TYPE: 'one'
        }, {
            ID: 91,
            METHOD: 'GET',
            ROUTE: '/services/attributes/',
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
        ID: { [Sequelize.Op.in]: [88, 91] }
    }, {}
    );
}


module.exports = { up, down };
