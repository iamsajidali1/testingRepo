const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const Roles = oneConnection.define('Roles', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    IDENTIFICATOR: Sequelize.STRING(100)

}, {
    tableName: 'CSS_ROLES',
    freezeTableName: true,
    timestamps: false,
});

module.exports = { Roles };
