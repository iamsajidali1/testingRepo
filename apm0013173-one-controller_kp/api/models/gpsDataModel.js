const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const GpsData = oneConnection.define('GpsData', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    GPS_NAME: {
        type: Sequelize.STRING(255)
    }
}, {
    tableName: 'CSS_GPS_DATA',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { GpsData };
