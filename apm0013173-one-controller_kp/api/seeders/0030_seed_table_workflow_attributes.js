/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_ATTRIBUTES', [{
            ID: 6,
            NAME: 'Rollback timer'
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
        'CSS_WORKFLOW_ATTRIBUTES', {
        ID: { [Sequelize.Op.in]: [6] }
    }, {}
    );
}


module.exports = { up, down };
