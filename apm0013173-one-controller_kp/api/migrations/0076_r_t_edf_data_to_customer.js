/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.renameTable(
        'CSS_EDF_DATA_TO_CUSTOMER','CSS_GRUA_DATA_TO_CUSTOMER',
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.renameTable(
        'CSS_GRUA_DATA_TO_CUSTOMER','CSS_EDF_DATA_TO_CUSTOMER'
    );
}

module.exports = { up, down };
