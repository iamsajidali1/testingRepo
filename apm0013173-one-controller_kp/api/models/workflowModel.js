const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();

const Workflow = oneConnection.define('Workflow', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: Sequelize.STRING(150)
}, {
    tableName: 'CSS_WORKFLOW',
    freezeTableName: true,
    timestamps: false
});


module.exports = { Workflow };
