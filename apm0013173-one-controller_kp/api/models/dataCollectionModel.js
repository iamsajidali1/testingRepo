const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();


const DataCollection = oneConnection.define("DataCollection", {
    "ID": {
        "type": Sequelize.INTEGER(11),
        "primaryKey": true,
        "unique": true,
        "allowNull": false,
        "autoIncrement": true
    },
    "COLLECTED_DATA":
    {
        "type": Sequelize.BLOB("long"),
        "allowNull": false
    },
    "TDC_ID": {
        "type": Sequelize.INTEGER(11),
        "references": {
            "model": "CSS_TDC_DATA",
            "key": "ID"
        },
        "onUpdate": "CASCADE",
        "onDelete": "CASCADE",
        "allowNull": true
    },
    "TRANSACTION_ID":
    {
        "type": Sequelize.STRING(255),
        "unique": true
    },
    "STATUS":
    {
        "type": Sequelize.STRING(255),
        "defaultValue": "Complete"
    }
}, {
    "tableName": "CSS_DATA_COLLECTION",
    "freezeTableName": true,
    "timestamps": true
});


module.exports = { DataCollection };
