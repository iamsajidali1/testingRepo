const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const ProductOrder = oneConnection.define(
    "ProductOrder",
    {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        EXTERNAL_ID: {
            type: Sequelize.STRING(100)
        },
        STATUS: {
            type: Sequelize.STRING(100)
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
    },
    {
        tableName: "CSS_PRODUCT_ORDER",
        freezeTableName: true,
        timestamps: false
    }
);

module.exports = { ProductOrder };
