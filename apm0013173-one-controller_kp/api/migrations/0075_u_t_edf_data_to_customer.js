/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
            'CSS_EDF_DATA_TO_CUSTOMER',
            'EDF_DATA_ID',
            'GRUA_ID'
        );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
            'CSS_EDF_DATA',
            'GRUA_ID',
            'EDF_DATA_ID'
        );
}

module.exports = { up, down };
