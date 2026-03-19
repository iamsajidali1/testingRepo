/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ROUTE_TO_ACTION', [{
            ID: 1,
            METHOD: 'GET',
            ROUTE: '/scripts/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: 'one'
        },{
            ID: 2,
            METHOD: 'POST',
            ROUTE: '/run-script/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 3,
            METHOD: 'POST',
            ROUTE: '/run-validation/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 4,
            METHOD: 'POST',
            ROUTE: '/push-config/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 5,
            METHOD: 'POST',
            ROUTE: '/set-rollback/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 6,
            METHOD: 'POST',
            ROUTE: '/rollback-now/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 7,
            METHOD: 'POST',
            ROUTE: '/confirm-change/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 8,
            METHOD: 'POST',
            ROUTE: '/mds/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 9,
            METHOD: 'POST',
            ROUTE: '/vco-users/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
        }, {
            ID: 10,
            METHOD: 'POST',
            ROUTE: '/vco-edge-bulk/',
            ACTION_ID: null,
            SCHEDULER: true,
            TYPE: null
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
        ID: { [Sequelize.Op.in]: [1, 10] }
    }, {}
    );
}


module.exports = { up, down };
