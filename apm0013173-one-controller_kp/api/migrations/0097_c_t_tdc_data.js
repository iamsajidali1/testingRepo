/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        "CSS_TDC_DATA", {
            "ID": {
                "type": Sequelize.INTEGER(11),
                "primaryKey": true,
                "unique": true,
                "allowNull": false,
                "autoIncrement": true
            },
            "DEVICE": {
                "type": Sequelize.STRING(100),
                "allowNull": false,
                "unique": true
            },
            "TEMPLATE_ID": {
                "type": Sequelize.INTEGER(11),
                "references": {
                    "model": "CSS_TEMPLATES",
                    "key": "ID"
                },
                "onUpdate": "CASCADE",
                "onDelete": "CASCADE",
                "allowNull": false
            },
            "CUSTOMER_GRUA": {
                "allowNull": false,
                "type": Sequelize.STRING(100)
            },
            "CALLBACK_URL": {
                "type": Sequelize.STRING(255),
                "allowNull": false
            },
            "SR": {
                "type": Sequelize.STRING(100),
                "allowNull": false
            },
            "GLID": Sequelize.STRING(100),
            "STATUS": {
                "type":Sequelize.STRING(100),
                "defaultValue": "Not Started"
            },
            "LATITUDE": {
                "type": Sequelize.STRING(100)
            },
            "LONGTITUDE": {
                "type": Sequelize.STRING(100)
            },
            "STREET": {
                "type": Sequelize.STRING(100),
                "allowNull": false
            },
            "CITY": {
                "type": Sequelize.STRING(100)
            },
            "STATE": {
                "type": Sequelize.STRING(100)
            },
            "COUNTRY": {
                "type": Sequelize.STRING(100),
                "allowNull": false
            },
            "ZIP": {
                "type": Sequelize.STRING(100),
                "allowNull": false
            },
            "SNOW_STATUS": {
                "type": Sequelize.STRING(100),
                "allowNull": false,
                "defaultValue": "enable"
            },
            "CREATE_DATE": {
                "type": Sequelize.DATE,
                "allowNull": false,
                "defaultValue": Sequelize.literal("CURRENT_TIMESTAMP")
            },
            "UPDATE_DATE": {
                "type": Sequelize.DATE,
                "allowNull": false,
                "defaultValue": Sequelize.literal("CURRENT_TIMESTAMP"),
                "onUpdate": Sequelize.literal("CURRENT_TIMESTAMP")
            }
        }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface) {
    return queryInterface.dropTable("CSS_TDC_DATA");
}


module.exports = { up, down };
