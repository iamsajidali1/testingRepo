/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_TEMPLATES', {
        ID: {
            type: Sequelize.INTEGER(11),
            autoIncrement: true,
            unique: true,
            allowNull: false,
            primaryKey: true
        },
        NAME: {
            type: Sequelize.STRING(40),
            allowNull: false
        },
        QUESTIONS: {
            type: Sequelize.BLOB('long')
        },
        // customer ID and customer name - must be separe table
        VALIDATION: {
            type: Sequelize.BLOB('long')
        },
        DESCRIPTION: {
            type: Sequelize.TEXT(),
            allowNull: false
        },
        STATICHOSTNAMECHECKBOX: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },
        // used text becuase of the search when someone try to remove carche template
        CARCHETEMPLATE: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        // service must be separate table with relation to template
        STATICHOSTNAME: {
            type: Sequelize.BLOB('long'),
            allowNull: true
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

    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_TEMPLATES');
}

module.exports = { up, down };
