/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_SERVICE_TO_CUSTOMER', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        CUSTOMER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_CUSTOMERS',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
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
    return queryInterface.dropTable('CSS_SERVICE_TO_CUSTOMER');
}


module.exports = { up, down };
