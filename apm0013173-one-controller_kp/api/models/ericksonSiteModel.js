const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const EricksonSite = oneConnection.define(
    "EricksonSite",
    {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true,
        },
        SITE_NAME: {
            type: Sequelize.STRING(100)
        },
        SITE_ID: {
            type: Sequelize.STRING(100)
        },
        GEOGRAPHICAL_SITE_ID: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: "CSS_GEOGRAPHICAL_SITE",
                key: "ID"
            }
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
    },
    {
        "tableName": "CSS_ERICKSON_SITES",
        "freezeTableName": true,
        "timestamps": false
    }
);

module.exports = { EricksonSite };
