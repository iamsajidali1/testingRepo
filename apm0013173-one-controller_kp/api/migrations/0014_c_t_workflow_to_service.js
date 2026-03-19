/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_WORKFLOW_TO_SERVICE', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        WORKFLOW_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_WORKFLOW",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        SERVICE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_SERVICES',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        }
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_WORKFLOW_TO_SERVICE');
}

module.exports = { up, down };
