/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ROLE_TO_COMPONENT_ACCESS', {
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
                model: 'CSS_ROLES',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        COMPONENT_KEY: {
            type: Sequelize.STRING(100),
            references: {
                model: 'CSS_APP_COMPONENTS',
                key: 'KEY'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        ACCESS_TYPE: {
            type: Sequelize.STRING(100),
            allowNull: false
        }
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_ROLE_TO_COMPONENT_ACCESS');
}


module.exports = { up, down };
