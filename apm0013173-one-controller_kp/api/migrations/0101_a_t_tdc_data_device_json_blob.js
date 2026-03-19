/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.addColumn(
        "CSS_TDC_DATA",
        "DEVICE_JSON_BLOB",
        {
            "type": Sequelize.JSON,
            "allowNull": true
        }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
    return queryInterface.removeColumn(
        "CSS_TDC_DATA",
        "DEVICE_JSON_BLOB"
    );
}

module.exports = { up, down };
