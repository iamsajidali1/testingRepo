const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const LeamData = oneConnection.define('LeamData', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    LEAM_ID: {
        type: Sequelize.STRING(255),
        allowNull: false
    }
}, {
    tableName: 'CSS_LEAM_DATA',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { LeamData };
