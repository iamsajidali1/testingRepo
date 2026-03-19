/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_WORKFLOW_TO_WORKFLOW_ATTRIBUTES', {
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
                model: 'CSS_WORKFLOW',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        WORKFLOW_ATTRIBUTE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_WORKFLOW_ATTRIBUTES',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        STATUS: Sequelize.STRING(15)
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_WORKFLOW_TO_WORKFLOW_ATTRIBUTES');
}

module.exports = { up, down };
