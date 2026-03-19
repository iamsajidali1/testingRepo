/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_TEMPLATE_TO_VENDOR', {
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
                model: "CSS_TEMPLATES",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        VENDOR_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_CONF_TEMPLATE_VENDOR_TYPES',
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
    return queryInterface.dropTable('CSS_TEMPLATE_TO_VENDOR');
}

module.exports = { up, down };
