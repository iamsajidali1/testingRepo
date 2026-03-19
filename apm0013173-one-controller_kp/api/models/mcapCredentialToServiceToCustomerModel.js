const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const McapCredentialToServiceToCustomer = oneConnection.define('McapCredentialToServiceToCustomer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_MCAP_CREDENTIAL_TO_SERVICE_TO_CUSTOMER',
    freezeTableName: true,
    timestamps: false
});


module.exports = { McapCredentialToServiceToCustomer };
