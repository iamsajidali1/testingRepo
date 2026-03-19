/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ROUTE_TO_ACTION', [{
            ID: 92,
            METHOD: 'GET',
            ROUTE: '/workflow/attributes/',
            ACTION_ID: null,
            SCHEDULER: false,
            TYPE: 'one'
        },{
            ID: 93,
            METHOD: 'POST',
            ROUTE: '/workflow/attribute/',
            ACTION_ID: null,
            SCHEDULER: false,
            TYPE: 'one'
        }, {
            ID: 94,
            METHOD: 'DELETE',
            ROUTE: '/workflow/attribute/',
            ACTION_ID: null,
            SCHEDULER: false,
            TYPE: 'one'
        }, {
            ID: 95,
            METHOD: 'GET',
            ROUTE: '/workflow/attribute/',
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
        ID: { [Sequelize.Op.in]: [92, 95] }
    }, {}
    );
}


module.exports = { up, down };
