const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const Characteristic = oneConnection.define('Characteristic', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    VALUE_TYPE: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    EXTERNAL_SOURCE: {
        type: Sequelize.STRING(100),
        allowNull: true
    },
    CREATE_DATE: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    UPDATE_DATE: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
}, {
    tableName: 'CSS_CHARACTERISTIC',
    freezeTableName: true,
    timestamps: false
});


module.exports = { Characteristic };
