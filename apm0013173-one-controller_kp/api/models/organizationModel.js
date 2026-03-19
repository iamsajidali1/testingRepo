const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const Organization = oneConnection.define(
    "Organization",
    {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        EXTERNAL_ID: {
            type: Sequelize.STRING(100),
            allowNull: true
        },
        GRUA: {
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
    },
    {
        tableName: "CSS_ORGANIZATION",
        freezeTableName: true,
        timestamps: false
    }
);

module.exports = { Organization };
