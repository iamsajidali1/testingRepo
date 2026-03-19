const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const UserToService = oneConnection.define('UserToService', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_USERS_TO_SERVICE',
    freezeTableName: true,
    timestamps: false
});


module.exports = { UserToService };
