const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const Users = oneConnection.define('Users', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: Sequelize.STRING(150),
    ATTUID: Sequelize.STRING(6),
    BC_USER_ID: Sequelize.STRING(150)
}, {
    tableName: 'CSS_USERS',
    freezeTableName: true,
    timestamps: false
});


module.exports = { Users };
