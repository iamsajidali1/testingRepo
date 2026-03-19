const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const GeographicalAddress = oneConnection.define(
    "GeographicalAddress",
    {
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
    },
    {
        tableName: "CSS_GEOGRAPHICAL_ADDRESS",
        freezeTableName: true,
        timestamps: false
    }
);

module.exports = { GeographicalAddress };
