/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_USERS_TO_ROLES', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        USER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_USERS",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        ROLE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_ROLES',
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
    return queryInterface.dropTable('CSS_USERS_TO_ROLES');
}

module.exports = { up, down };
