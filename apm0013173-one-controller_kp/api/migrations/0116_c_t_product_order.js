/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_PRODUCT_ORDER", {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        EXTERNAL_ID: {
            type: Sequelize.STRING(100)
        },
        STATUS: {
            type: Sequelize.STRING(100)
        },
        CREATE_DATE: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        UPDATE_DATE: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            onUpdate: Sequelize.literal("CURRENT_TIMESTAMP")
        }
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
    return queryInterface.dropTable("CSS_PRODUCT_ORDER");
}

module.exports = { up, down };
