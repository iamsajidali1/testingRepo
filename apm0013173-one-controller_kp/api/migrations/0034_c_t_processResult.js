/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_PROCESS_RESULT', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        RESULT:
        {
            type: Sequelize.BLOB('long'),
            allowNull: false
        },
        STATUS: {
            type: Sequelize.STRING(120),
            allowNull: false
        },
        CODE: {
            type: Sequelize.STRING(120),
            allowNull: false
        },
        RESULT_TYPE: {
            type: Sequelize.STRING(120),
            allowNull: false
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
    return queryInterface.dropTable('CSS_PROCESS_RESULT');
}

module.exports = { up, down };
