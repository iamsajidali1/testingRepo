const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const ServiceToServiceAttributes = oneConnection.define('ServiceToServiceAttributes', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_SERVICE_TO_SERVICE_ATTRIBUTES',
    freezeTableName: true,
    timestamps: false
});


module.exports = { ServiceToServiceAttributes };
