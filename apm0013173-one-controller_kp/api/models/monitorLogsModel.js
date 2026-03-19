const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const MonitorLogs = oneConnection.define('MonitorLogs', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    STATUS: {
        type: Sequelize.TEXT(),
        allowNull: false,
    },
    TRANSACTION_ID: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    IS_EXTERNAL_CUSTOMER: Sequelize.BOOLEAN,
    HOSTNAME: Sequelize.BLOB('long'),
    ORCHESTRATOR_RESPONSE: Sequelize.BLOB('long'),
    MCAP_TRANSACTION_ID: Sequelize.STRING(255),
    CARCHE_TRANSACTION_ID: Sequelize.STRING(255),
    COLLECTED_DATA: Sequelize.BLOB('long')

}, {
    tableName: 'CSS_MONITOR_LOGS',
    freezeTableName: true,
    timestamps: true,
});


module.exports = { MonitorLogs };
