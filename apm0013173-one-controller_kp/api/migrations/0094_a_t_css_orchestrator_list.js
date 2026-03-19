/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_ORCHESTRATOR_LIST',
            'CONFIG_YAML',
            {
                type: Sequelize.TEXT,
                allowNull: true
            }
        )
    ]);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.removeColumn(
            'CSS_ORCHESTRATOR_LIST',
            'CONFIG_YAML',
        )
    ]);
}

module.exports = { up, down };
