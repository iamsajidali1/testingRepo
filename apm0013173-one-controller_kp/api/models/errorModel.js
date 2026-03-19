const { Sequelize } = require("sequelize");
const conn = require("../connections");


exports.name = "Error";
exports.model = {
    "ID": {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    "MESSAGE": Sequelize.TEXT
};

exports.opts = {
    "freezeTableName": true,
    "tableName": 'CSS_ERROR',
    "timestamps": false
};

exports.define = () => {
    const seq = conn.getSequelize();
    return seq.define(exports.name, exports.model, exports.opts);
};
