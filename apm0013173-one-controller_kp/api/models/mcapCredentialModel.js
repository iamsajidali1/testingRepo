const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const McapCredential = oneConnection.define('McapCredential', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    CREDENTIAL: {
        type: Sequelize.STRING(255)
    }
}, {
    tableName: 'CSS_MCAP_CREDENTIAL',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { McapCredential };
