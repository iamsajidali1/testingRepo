const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const OrchestratorList = oneConnection.define('OrchestratorList', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    URL: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    TENANT_ID: Sequelize.STRING(50),
    TAGS: Sequelize.TEXT(),
    CONFIG_YAML: Sequelize.TEXT()
}, {
    tableName: 'CSS_ORCHESTRATOR_LIST',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { OrchestratorList };
