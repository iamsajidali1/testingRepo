/* eslint-disable new-cap, sort-keys, no-magic-numbers */
const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const CachedDevicesData = oneConnection.define(
    "CachedDevicesEdfData",
    {
        "ID": {
            "type": Sequelize.STRING(100),
            "primaryKey": true,
            "unique": true,
            "allowNull": false
        },
        "HOSTNAME": {
            "type": Sequelize.STRING(100)
        },
        "TYPE": {
            "type": Sequelize.STRING(100)
        },
        "CATEGORY": {
            "type": Sequelize.STRING(100)
        },
        "PARTNUM": {
            "type": Sequelize.STRING(100)
        },
        "VENDOR": {
            "type": Sequelize.STRING(100)
        },
        "SERVICE": {
            "type": Sequelize.STRING(100)
        },
        "ADDRESS": {
            "type": Sequelize.STRING(255)
        },
        "CITY": {
            "type": Sequelize.STRING(100)
        },
        "STATE": {
            "type": Sequelize.STRING(100)
        },
        "ZIP": {
            "type": Sequelize.STRING(100)
        },
        "COUNTRY": {
            "type": Sequelize.STRING(100)
        },
        "GRUA": {
            "type": Sequelize.STRING(10)
        },
        "SERVICE_NAME": {
            "type": Sequelize.STRING(100)
        },
        "DATA_SRC": {
            "type": Sequelize.STRING(100)
        },
        "CACHING_FN": {
            "type": Sequelize.STRING(100)
        }
    },
    {
        "tableName": "CSS_CACHED_DEVICES_DATA",
        "freezeTableName": true,
        // Don't forget to enable timestamps!
        "timestamps": true
    }
);

module.exports = { CachedDevicesData };
