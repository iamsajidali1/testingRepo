const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const FormRule = oneConnection.define('FormRule', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    SEQUENCE: {
        type: Sequelize.INTEGER(11),
        allowNull: false
    },
    WHEN_CONDITIONS: {
        type: Sequelize.JSON(),
        allowNull: false
    },
    THEN_CONDITIONS: {
        type: Sequelize.JSON(),
        allowNull: false
    },
    TEMPLATE_ID: {
        type: Sequelize.INTEGER(11),
        references: {
            model: "CSS_TEMPLATES",
            key: "ID"
        },
        allowNull: false
    },
    CREATE_DATE: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    UPDATE_DATE: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP")
    }
}, {
    tableName: 'CSS_FORM_RULES',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { FormRule };
