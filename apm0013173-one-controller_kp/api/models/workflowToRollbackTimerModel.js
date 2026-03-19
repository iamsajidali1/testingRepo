const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const WorkflowToRollbackTimer = oneConnection.define('WorkflowToRollbackTimer', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    MIN_ROLLBACK_TIMER: Sequelize.INTEGER(2),
    MAX_ROLLBACK_TIMER: Sequelize.INTEGER(3)
}, {
    tableName: 'CSS_ROLLBACK_TIMER_TO_WORKFLOW',
    freezeTableName: true,
    timestamps: false
});


module.exports = { WorkflowToRollbackTimer };
