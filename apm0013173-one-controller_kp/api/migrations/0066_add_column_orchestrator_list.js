/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.addColumn(
        'CSS_ORCHESTRATOR_LIST', 'TAGS', {
            type: Sequelize.TEXT(),
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
        'CSS_ORCHESTRATOR_LIST',
        'TAGS'
    );
}

module.exports = { up, down };
