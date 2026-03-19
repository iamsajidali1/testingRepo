/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_GPS_DATA_TO_CUSTOMER');
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_GPS_DATA_TO_CUSTOMER', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        GPS_DATA_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_GPS_DATA",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        CUSTOMER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_SERVICE_TO_CUSTOMER',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        }
    }
    );
}

module.exports = { up, down };
