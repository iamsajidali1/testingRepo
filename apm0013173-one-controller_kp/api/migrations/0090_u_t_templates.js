/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_TEMPLATES',
            'MAX_ROLLBACK_TIMER',
            {
                type: Sequelize.INTEGER(3),
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
        queryInterface.addColumn(
            'CSS_TEMPLATES',
            'MAX_ROLLBACK_TIMER',
            {
                type: Sequelize.INTEGER(3),
            }
        )
    ]);
}

module.exports = { up, down };
