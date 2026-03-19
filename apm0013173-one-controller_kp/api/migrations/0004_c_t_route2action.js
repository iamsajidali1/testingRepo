/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ROUTE_TO_ACTION', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        ROUTE: Sequelize.STRING(120),
        ACTION_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_ACTIONS',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        SCHEDULER: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },
        METHOD: Sequelize.STRING(20)
    }
    );
}
/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_ROUTE_TO_ACTION');
}


module.exports = { up, down };
