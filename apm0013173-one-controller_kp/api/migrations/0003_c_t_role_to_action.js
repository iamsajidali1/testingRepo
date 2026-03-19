/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ROLE_TO_ACTION', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        ROLE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_ROLES",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        ACTION_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_ACTIONS',
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
    return queryInterface.dropTable('CSS_ROLE_TO_ACTION');
}

module.exports = { up, down };
