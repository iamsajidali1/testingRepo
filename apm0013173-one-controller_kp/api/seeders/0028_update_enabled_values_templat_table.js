/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
    UPDATE css_templates
    SET css_templates.ENABLED = 1
    where ID <= (
        SELECT MAX(ID)
        FROM (SELECT * FROM css_templates) AS templates
    )
    `);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`UUPDATE css_templates
    SET css_templates.ENABLED = 0
    where ID <= (
        SELECT MAX(ID)
        FROM (SELECT * FROM css_templates) AS templates
    )
    `);
}


module.exports = { up, down };
