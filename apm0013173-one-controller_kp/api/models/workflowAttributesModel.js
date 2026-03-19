const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


// map specific endpoint routes to required actions
// to permit/forbid roles from using specific APIs
const WorkflowAttributes = oneConnection.define('WorkflowAttributes', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: Sequelize.STRING(150)
}, {
    tableName: 'CSS_WORKFLOW_ATTRIBUTES',
    freezeTableName: true,
    timestamps: false
});


module.exports = { WorkflowAttributes };
