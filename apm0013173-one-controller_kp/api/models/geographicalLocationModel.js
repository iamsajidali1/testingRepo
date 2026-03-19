const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const GeographicalLocation = oneConnection.define(
    "GeographicalLocation",
    {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        LATITUDE: {
            type: Sequelize.STRING(100)
        },
        LONGITUDE: {
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
        tableName: "CSS_GEOGRAPHICAL_LOCATION",
        freezeTableName: true,
        timestamps: false
    }
);

module.exports = { GeographicalLocation };
