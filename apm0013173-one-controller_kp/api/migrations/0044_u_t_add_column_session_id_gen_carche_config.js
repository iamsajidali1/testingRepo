/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.addColumn(
        'CSS_CARCHE_GENERATED_CONFIG', 'SESSION_ID', {
        type: Sequelize.STRING(255),
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
        'CSS_CARCHE_GENERATED_CONFIG',
        'SESSION_ID'
    );
}

module.exports = { up, down };
