const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const OrchestratorLicenseData = oneConnection.define('OrchestratorLicenseData', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    ORCHESTRATOR: {
        type: Sequelize.STRING(255),
        unique: true,
    },
    LICENSE_DATA: {
        type: Sequelize.JSON()
    }
}, {
    tableName: 'CSS_ORCHESTRATOR_LICENSE',
    freezeTableName: true,
    timestamps: true
});


module.exports = { OrchestratorLicenseData };
