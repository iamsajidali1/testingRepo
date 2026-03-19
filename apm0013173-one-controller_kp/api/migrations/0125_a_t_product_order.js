/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("CSS_PRODUCT_ORDER", "STATUS", {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "enable"
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("CSS_PRODUCT_ORDER", "STATUS", {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
    });
}

module.exports = { up, down };
