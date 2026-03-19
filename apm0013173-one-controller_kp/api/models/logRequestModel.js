const { Sequelize } = require("sequelize");
const conn = require("../connections");


exports.name = "Request";
exports.model = {
    "ID": {
        "type": Sequelize.INTEGER(11),
        "primaryKey": true,
        "unique": true,
        "allowNull": false,
        "autoIncrement": true
    },
    "REMOTE_ADDR": Sequelize.STRING(50),
    "DATE": Sequelize.DATE(),
    "METHOD": Sequelize.STRING(50),
    "URL": Sequelize.TEXT(),
    "STATUS": Sequelize.INTEGER(11),
    "BODY": Sequelize.TEXT(),
    "REQUEST_BODY": Sequelize.BLOB('long'),
    "SESSION": {
        "type": Sequelize.STRING(255),
        "allowNull": true,
        "defaultValue": null
    }
};

exports.opts = {
    "freezeTableName": true,
    "tableName": 'CSS_LOG_REQUEST',
    "timestamps": false
};

exports.define = () => {
    const seq = conn.getSequelize();
    return seq.define(exports.name, exports.model, exports.opts);
};
