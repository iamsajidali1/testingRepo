const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const Actions = oneConnection.define('Actions', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: Sequelize.STRING(100),
}, {
    tableName: 'CSS_ACTIONS',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { Actions };
