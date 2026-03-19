/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_SERVICE_ATTRIBUTES', [{
            ID: 4,
            NAME: 'Auto CR Creation'
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
        ID: { [Sequelize.Op.in]: [4] }
    }, {}
    );
}


module.exports = { up, down };
