/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.changeColumn(
            'CSS_TRANSACTION',
            'USER_ID',
            {
                type: Sequelize.STRING(64)
            }
        );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.changeColumn(
            'CSS_TRANSACTION',
            'USER_ID',
            {
                type: Sequelize.STRING(6)
            }
        );
}

module.exports = { up, down };
