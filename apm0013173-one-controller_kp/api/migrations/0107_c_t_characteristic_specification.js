/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_CHARACTERISTIC_SPECIFICATION", {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        CHARACTERISTIC_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false,
            references: {
                model: "CSS_CHARACTERISTIC",
                key: "ID"
            }
        },
        VALUE: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        EXTERNAL_ID: {
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
    return queryInterface.dropTable("CSS_CHARACTERISTIC_SPECIFICATION");
}

module.exports = { up, down };
