const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const CarcheGeneratedConfig = oneConnection.define('CarcheGeneratedConfig', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    TEMPLATE_FILE: {
        type: Sequelize.STRING(255),
        allowNull: false,
    },
    //for save any data related with carche
    TEMPLATE_UUID: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    GENERATED_TEMPLATE: Sequelize.BLOB('long'),
    CARCHE_DATA: {
        type: Sequelize.JSON(),
        allowNull: false
    },
    SESSION_ID: {
        type: Sequelize.STRING(255),
        defaultValue: null
    }

}, {
    tableName: 'CSS_CARCHE_GENERATED_CONFIG',
    freezeTableName: true,
    timestamps: true,
});

module.exports = { CarcheGeneratedConfig };
