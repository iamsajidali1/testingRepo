/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_DATA_TEMPLATES', {
            ID: {
                type: Sequelize.INTEGER(11),
                primaryKey: true,
                unique: true,
                allowNull: false,
                autoIncrement: true
            },
            ACTION_ID: {
                type: Sequelize.INTEGER(11),
                references: {
                    model: 'CSS_TEMPLATES',
                    key: 'ID'
                },
                onUpdate: 'cascade',
                onDelete: 'cascade',
                allowNull: false,
            },
            CUSTOMER_ID: {
                type: Sequelize.INTEGER(11),
                references: {
                    model: 'CSS_CUSTOMERS',
                    key: 'ID'
                },
                onUpdate: 'cascade',
                onDelete: 'cascade',
                allowNull: true,
            },
            SERVICE_ID: {
                type: Sequelize.INTEGER(11),
                references: {
                    model: 'CSS_SERVICES',
                    key: 'ID'
                },
                onUpdate: 'cascade',
                onDelete: 'cascade',
                allowNull: true,
            },
            NAME: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            DATA: {
                type: Sequelize.JSON,
                allowNull: false,
            },
            ACTIVE: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
                onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
            }
        }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_DATA_TEMPLATES');
}


module.exports = { up, down };
