const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const GruaData = oneConnection.define('GruaData', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    GRUA: {
        type: Sequelize.STRING(255)
    }
}, {
    tableName: 'CSS_GRUA_DATA',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { GruaData };
