/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
            'CSS_TRANSACTION',
            'ATTUID',
            'USER_ID'
        );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
            'CSS_TRANSACTION',
            'USER_ID',
            'ATTUID'
        );
}

module.exports = { up, down };
