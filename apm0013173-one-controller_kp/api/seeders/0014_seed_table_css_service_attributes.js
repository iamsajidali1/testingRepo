/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_SERVICE_ATTRIBUTES', [{
            ID: 1,
            NAME: 'Mcap credentials'
        },{
            ID: 2,
            NAME: 'Orchestrator list'
        }, {
            ID: 3,
            NAME: 'Action data'
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
        'CSS_SERVICE_ATTRIBUTES', {
        ID: { [Sequelize.Op.in]: [1, 3] }
    }, {}
    );
}


module.exports = { up, down };
