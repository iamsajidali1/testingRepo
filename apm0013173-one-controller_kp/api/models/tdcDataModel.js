const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const TDCData = oneConnection.define(
    "TDCData",
    {
        "ID": {
            "type": Sequelize.INTEGER(11),
            "primaryKey": true,

            "allowNull": false,
            "autoIncrement": true
        },
        "DEVICE": {
            "type": Sequelize.STRING(100),
            "allowNull": false,
            "unique": true
        },
        "TEMPLATE_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_TEMPLATES",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "CASCADE",
            "allowNull": false
        },
        "ORGANIZATION_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_ORGANIZATION",
                "key": "ID"
            },
            "allowNull": false
        },
        "CALLBACK_URL": {
            "type": Sequelize.STRING(255),
            "allowNull": false
        },
        "STATUS": {
            "type": Sequelize.STRING(100),
            "defaultValue": "Not Started"
        },
        "DEVICE_JSON_BLOB": {
            "type": Sequelize.JSON(),
            "allowNull": true
        },
        "PRODUCT_ORDER_ID": {
            "type": Sequelize.INTEGER(11),
            "allowNull": true,
        },
        "GEOGRAPHICAL_SITE_ID": {
            "type": Sequelize.INTEGER(11),
            "allowNull": true,
            "references": {
                "model": "CSS_GEOGRAPHICAL_SITE",
                "key": "ID"
            },
        },
        "CREATE_DATE": {
            "type": Sequelize.DATE,
            "allowNull": false,
            "defaultValue": Sequelize.literal("CURRENT_TIMESTAMP")
        },
        "UPDATE_DATE": {
            "type": Sequelize.DATE,
            "allowNull": false,
            "defaultValue": Sequelize.literal("CURRENT_TIMESTAMP"),
            "onUpdate": Sequelize.literal("CURRENT_TIMESTAMP")
        }
    },
    {
        "tableName": "CSS_TDC_DATA",
        "freezeTableName": true,
        "timestamps": false
    }
);

module.exports = { TDCData };
