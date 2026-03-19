const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const ActionDataToServiceToCustomer = oneConnection.define('ActionDataToServiceToCustomer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_ACTION_DATA_TO_SERVICE_TO_CUSTOMER',
    freezeTableName: true,
    timestamps: false
});


module.exports = { ActionDataToServiceToCustomer };
