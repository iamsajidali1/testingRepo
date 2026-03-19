/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_SERVICE_ATTRIBUTES', [{
            ID: 5,
            NAME: 'Orchestrator yaml'
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
        ID: { [Sequelize.Op.in]: [5] }
    }, {}
    );
}


module.exports = { up, down };
