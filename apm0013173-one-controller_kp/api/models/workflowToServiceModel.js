const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const WorkFlowToService = oneConnection.define('WorkFlowToService', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_WORKFLOW_TO_SERVICE',
    freezeTableName: true,
    timestamps: false
});


module.exports = { WorkFlowToService };
