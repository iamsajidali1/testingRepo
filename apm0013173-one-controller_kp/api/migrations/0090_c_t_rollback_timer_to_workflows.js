/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ROLLBACK_TIMER_TO_WORKFLOW', {
        ID:
        {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        MIN_ROLLBACK_TIMER: Sequelize.INTEGER(2),
        MAX_ROLLBACK_TIMER: Sequelize.INTEGER(3),
        WORKFLOW_ID: {
            type: Sequelize.INTEGER(11),
            references: {
              model: "CSS_WORKFLOW",
              key: "ID",
            },
            onUpdate: "cascade",
            onDelete: "cascade",
          },
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_ROLLBACK_TIMER_TO_WORKFLOW');
}


module.exports = { up, down };
