const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const Device = oneConnection.define(
    "Device",
    {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        CHARACTERISTIC_SPECIFICATION_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false
        },
        VALUE: {
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
    },
    {
        tableName: "CSS_DEVICE",
        freezeTableName: true,
        timestamps: false
    }
);

module.exports = { Device };
