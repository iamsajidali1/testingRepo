/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_CHARACTERISTIC", {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        NAME: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        VALUE_TYPE: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        EXTERNAL_SOURCE: {
            type: Sequelize.STRING(100),
            allowNull: true
        },
        CREATE_DATE: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        UPDATE_DATE: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
    return queryInterface.dropTable("CSS_CHARACTERISTIC");
}

module.exports = { up, down };
