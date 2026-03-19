/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_GEOGRAPHICAL_SITE", {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        NAME: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        GEOGRAPHICAL_LOCATION_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false
        },
        GEOGRAPHICAL_ADDRESS_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false
        },
        ORGANIZATION_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false
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
    return queryInterface.dropTable("CSS_GEOGRAPHICAL_SITE");
}

module.exports = { up, down };
