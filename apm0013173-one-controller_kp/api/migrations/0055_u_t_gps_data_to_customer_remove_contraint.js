/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.removeConstraint(
        'CSS_GPS_DATA_TO_CUSTOMER',
        'css_gps_data_to_customer_ibfk_2'
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.addConstraint(
        'CSS_GPS_DATA_TO_CUSTOMER',
        ['CUSTOMER_ID'], {
        type: 'foreign key',
        name: 'css_gps_data_to_customer_ibfk_2',
        references: {
            table: 'CSS_SERVICE_TO_CUSTOMER',
            field: 'ID'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
    }
    );
}

module.exports = { up, down };
