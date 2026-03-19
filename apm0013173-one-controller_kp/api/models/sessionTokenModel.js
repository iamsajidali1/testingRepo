const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();

const SessionToken = oneConnection.define('SessionToken', {
    ID: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    SESSION_ID: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
    },
    ACCESS_TOKEN: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    REFRESH_TOKEN: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    EXPIRE_IN: {
        type: Sequelize.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'CSS_SESSION_TOKEN',
    freezeTableName: true,
    timestamps: false,
});

module.exports = { SessionToken };
