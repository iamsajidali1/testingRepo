const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const GpsDataToCustomer = oneConnection.define('GpsDataToCustomer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_GPS_DATA_TO_CUSTOMER',
    freezeTableName: true,
    timestamps: false
});


module.exports = { GpsDataToCustomer };
