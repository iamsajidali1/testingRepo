/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_ATTRIBUTES', [{
            ID: 5,
            NAME: 'Reports API Endpoint'
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
        ID: { [Sequelize.Op.in]: [5] }
    }, {}
    );
}


module.exports = { up, down };
