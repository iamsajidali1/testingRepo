const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const TemplateToServiceToCustomer = oneConnection.define('TemplateToServiceToCustomer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_TEMPLATE_TO_SERVICE_TO_CUSTOMER',
    freezeTableName: true,
    timestamps: false
});


module.exports = { TemplateToServiceToCustomer };
