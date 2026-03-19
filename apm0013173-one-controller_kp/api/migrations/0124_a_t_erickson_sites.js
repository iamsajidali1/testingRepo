/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").Sequelize} Sequelize
 */
async function up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
        try {
            await queryInterface.addConstraint('CSS_ERICKSON_SITES', {
                fields: ['GEOGRAPHICAL_SITE_ID'],
                type: 'foreign key',
                name: 'fk_erickson_site_geographical_site',
                references: {
                    table: 'CSS_GEOGRAPHICAL_SITE',
                    field: 'ID'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }, { transaction });
        } catch (error) {
            console.error('Error adding foreign key constraint:', error);
            throw error;
        }
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").Sequelize} Sequelize
 */
async function down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
        try {
            await queryInterface.removeConstraint('CSS_ERICKSON_SITES', 'fk_erickson_site_geographical_site', { transaction });
        } catch (error) {
            console.error('Error removing foreign key constraint:', error);
            throw error;
        }
    });
}

module.exports = { up, down };