/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.removeColumn(
        'CSS_CARCHE_GENERATED_CONFIG', 'USER_ID'
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.addColumn(
        'CSS_CARCHE_GENERATED_CONFIG',
        'USER_ID', {
        type: Sequelize.INTEGER(11),
        references: {
            model: 'CSS_USERS',
            key: 'ID'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
    },
    );
}

module.exports = { up, down };
