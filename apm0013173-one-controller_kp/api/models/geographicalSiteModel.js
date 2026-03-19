const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const GeographicalSite = oneConnection.define(
    "GeographicalSite",
    {
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
            allowNull: false,
            references: {
                model: "CSS_GEOGRAPHICAL_LOCATION",
                key: "ID"
            },
        },
        GEOGRAPHICAL_ADDRESS_ID: {
            type: Sequelize.INTEGER(11),
            allowNull: false,
            references: {
                model: "CSS_GEOGRAPHICAL_ADDRESS",
                key: "ID"
            },
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
    },
    {
        tableName: "CSS_GEOGRAPHICAL_SITE",
        freezeTableName: true,
        timestamps: false
    }
);

module.exports = { GeographicalSite };
