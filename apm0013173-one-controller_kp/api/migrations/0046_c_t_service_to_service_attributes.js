/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_SERVICE_TO_SERVICE_ATTRIBUTES', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        SERVICE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_SERVICES',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        SERVICE_ATTRIBUTE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_SERVICE_ATTRIBUTES',
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
    return queryInterface.dropTable('CSS_SERVICE_TO_SERVICE_ATTRIBUTES');
}

module.exports = { up, down };
