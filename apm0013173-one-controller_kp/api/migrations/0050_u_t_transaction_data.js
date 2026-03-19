/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_TRANSACTION',
            'IS_ACTIVE',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            }
        ),
        queryInterface.addColumn(
            'CSS_TRANSACTION',
            'createdAt',
            {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        ),
        queryInterface.addColumn(
            'CSS_TRANSACTION',
            'updatedAt',
            {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
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
            'CSS_TRANSACTION',
            'IS_ACTIVE',
        ),
        queryInterface.removeColumn(
            'CSS_TRANSACTION',
            'createdAt',
        ),
        queryInterface.removeColumn(
            'CSS_TRANSACTION',
            'updatedAt',
        ),
    ]);
}

module.exports = { up, down };
