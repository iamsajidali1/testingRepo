/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_TEMPLATES',
            'ENABLED',
            {
                type: Sequelize.BOOLEAN,
                allowNull: false
            }
        )
    ]);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.removeColumn(
            'CSS_TEMPLATES',
            'ENABLED',
        )
    ]);
}

module.exports = { up, down };
