const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const GruaDataToCustomer = oneConnection.define('GruaDataToCustomer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_GRUA_DATA_TO_CUSTOMER',
    freezeTableName: true,
    timestamps: false
});


module.exports = { GruaDataToCustomer };
