/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_CONF_TEMPLATE_CONTENT_TYPES', {
        ID:
        {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
            },
        CONTENT_TYPE: {
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
    return queryInterface.dropTable('CSS_CONF_TEMPLATE_CONTENT_TYPES');
}


module.exports = { up, down };
