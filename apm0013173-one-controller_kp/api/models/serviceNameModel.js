const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const ServiceName = oneConnection.define('ServiceName', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    SERVICE_NAME: {
        type: Sequelize.STRING(150)
    },

}, {
    tableName: 'CSS_SERVICES',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { ServiceName };
