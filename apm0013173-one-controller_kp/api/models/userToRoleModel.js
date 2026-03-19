const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const UserToRole = oneConnection.define('UserToRole', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_USERS_TO_ROLES',
    freezeTableName: true,
    timestamps: false
});


module.exports = { UserToRole };
