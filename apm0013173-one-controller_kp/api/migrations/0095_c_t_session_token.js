/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_SESSION_TOKEN', {
        ID:
        {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        SESSION_ID: Sequelize.STRING(100),
        ACCESS_TOKEN: Sequelize.STRING(100),
        REFRESH_TOKEN: Sequelize.STRING(100),
        EXPIRE_IN: Sequelize.STRING(100)
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_SESSION_TOKEN');
}


module.exports = { up, down };
