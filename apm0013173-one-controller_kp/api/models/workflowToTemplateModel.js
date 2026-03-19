const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const WorkFlowToTemplate = oneConnection.define('WorkFlowToTemplate', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_WORKFLOW_TO_TEMPLATE',
    freezeTableName: true,
    timestamps: false
});


module.exports = { WorkFlowToTemplate };
