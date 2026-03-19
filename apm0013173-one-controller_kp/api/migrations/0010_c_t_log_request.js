/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_LOG_REQUEST', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        REMOTE_ADDR: Sequelize.STRING(50),
        DATE: Sequelize.DATE(),
        METHOD: Sequelize.STRING(50),
        URL: Sequelize.TEXT(),
        STATUS: Sequelize.INTEGER(11),
        BODY: Sequelize.TEXT(),
        REQUEST_BODY: Sequelize.BLOB('long')
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_LOG_REQUEST');
}

module.exports = { up, down };
