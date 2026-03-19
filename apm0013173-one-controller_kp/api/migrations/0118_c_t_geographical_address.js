/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_GEOGRAPHICAL_ADDRESS", {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        GLID: Sequelize.STRING(100),
        STREET_NAME: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        CITY: {
            type: Sequelize.STRING(100)
        },
        STATE: {
            type: Sequelize.STRING(100)
        },
        COUNTRY: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        ZIP: {
            type: Sequelize.STRING(100),
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
    return queryInterface.dropTable("CSS_GEOGRAPHICAL_ADDRESS");
}

module.exports = { up, down };
