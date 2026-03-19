/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            "CSS_DATA_COLLECTION",
            "TDC_ID",
            {
                "type": Sequelize.INTEGER(11),
                "references": {
                    "model": "CSS_TDC_DATA",
                    "key": "ID"
                },
                "onUpdate": "CASCADE",
                "onDelete": "CASCADE",
                "allowNull": true
            }
        ),
        queryInterface.addColumn(
            "CSS_DATA_COLLECTION",
            "TRANSACTION_ID",
            {
                "type": Sequelize.STRING(255),
                "unique": true
            }
        ),
        queryInterface.addColumn(
            "CSS_DATA_COLLECTION",
            "STATUS",
            {
                "type": Sequelize.STRING(255),
                "defaultValue": "Complete"
            }
        )
    ]);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
    return Promise.all([
        queryInterface.removeColumn(
            "CSS_DATA_COLLECTION",
            "TDC_ID"
        ),
        queryInterface.removeColumn(
            "CSS_DATA_COLLECTION",
            "TRANSACTION_ID"
        ),
        queryInterface.removeColumn(
            "CSS_DATA_COLLECTION",
            "STATUS"
        )
    ]);
}

module.exports = { up, down };
