/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_CARCHE_GENERATED_CONFIG', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        TEMPLATE_FILE: {
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        CARCHE_DATA: {
            type: Sequelize.BLOB('long'),
            allowNull: false,
        },
        TEMPLATE_UUID: {
            type: Sequelize.STRING(255),
            allowNull: false
        },
        GENERATED_TEMPLATE: Sequelize.BLOB('long'),
        USER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_USERS',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_CARCHE_GENERATED_CONFIG');
}


module.exports = { up, down };
