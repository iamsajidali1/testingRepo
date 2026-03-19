const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const WorkflowToWorkflowAttributes = oneConnection.define('WorkflowToWorkflowAttributes', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    STATUS: Sequelize.STRING(15)
}, {
    tableName: 'CSS_WORKFLOW_TO_WORKFLOW_ATTRIBUTES',
    freezeTableName: true,
    timestamps: false
});


module.exports = { WorkflowToWorkflowAttributes };
