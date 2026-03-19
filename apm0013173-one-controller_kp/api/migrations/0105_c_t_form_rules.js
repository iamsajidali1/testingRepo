/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_FORM_RULES", {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        SEQUENCE: {
            type: Sequelize.INTEGER(11),
            allowNull: false
        },
        WHEN_CONDITIONS: {
            type: Sequelize.JSON(),
            allowNull: false
        },
        THEN_CONDITIONS: {
            type: Sequelize.JSON(),
            allowNull: false
        },
        TEMPLATE_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false,
            references: {
                model: "CSS_TEMPLATES",
                key: "ID"
            },
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
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface) {
    return queryInterface.dropTable("CSS_FORM_RULES");
}


module.exports = { up, down };
