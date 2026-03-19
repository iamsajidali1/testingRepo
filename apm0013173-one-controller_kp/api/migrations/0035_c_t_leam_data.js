/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_LEAM_DATA', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        LEAM_ID:
        {
            type: Sequelize.STRING(255),
            allowNull: false
        }
    }
    );
}

/**
* @param {import("sequelize").QueryInterface} queryInterface
* @param {import("sequelize").DataTypes} Sequelize
*/
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_LEAM_DATA');
}


module.exports = { up, down };
