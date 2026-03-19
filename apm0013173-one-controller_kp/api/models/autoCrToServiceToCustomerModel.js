const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const AutoCrToServiceToCustomer = oneConnection.define('AutoCrToServiceToCustomer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }, 
    SHOULD_AUTO_CREATE_CR: {
        type: Sequelize.BOOLEAN
    }
}, {
    tableName: 'CSS_AUTO_CR_TO_SERVICE_TO_CUSTOMER',
    freezeTableName: true,
    timestamps: false
});


module.exports = { AutoCrToServiceToCustomer };
