/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_MCAP_ERROR_MESSAGES', {
        ID:
        {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        MESSAGE: {
            type: Sequelize.TEXT(),
            allowNull: false,
          },
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface) {
    return queryInterface.dropTable('CSS_MCAP_ERROR_MESSAGES');
}


module.exports = { up, down };
