/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ROLE_TO_TEMPLATE', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        TEMPLATE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_TEMPLATES',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
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
    return queryInterface.dropTable('CSS_ROLE_TO_TEMPLATE');
}


module.exports = { up, down };
