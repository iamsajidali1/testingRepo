/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.addColumn(
        'CSS_ROUTE_TO_ACTION', 'TYPE', {
            type: Sequelize.STRING(20),
            defaultValue: null
        }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.removeColumn(
        'CSS_ROUTE_TO_ACTION',
        'TYPE'
    );
}

module.exports = { up, down };
