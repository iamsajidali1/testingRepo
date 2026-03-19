const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const CharacteristicSpecification = oneConnection.define('CharacteristicSpecification', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    CHARACTERISTIC_ID: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
            model: "CSS_CHARACTERISTIC",
            key: "ID"
        }
    },
    VALUE: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    EXTERNAL_ID: {
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
    tableName: 'CSS_CHARACTERISTIC_SPECIFICATION',
    freezeTableName: true,
    timestamps: false
});


module.exports = { CharacteristicSpecification };
