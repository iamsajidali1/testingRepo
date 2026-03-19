/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
    INSERT INTO CSS_AUTO_CR_TO_SERVICE_TO_CUSTOMER (SHOULD_AUTO_CREATE_CR, SERVICE_TO_CUSTOMER_ID)
    SELECT
        1,
        ID
    FROM
        css_service_to_customer
    WHERE
        SERVICE_ID in(1, 2, 4);`);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
    DELETE FROM CSS_AUTO_CR_TO_SERVICE_TO_CUSTOMER
    WHERE SERVICE_TO_CUSTOMER_ID IN(
            SELECT
                ID FROM css_service_to_customer
            WHERE
                SERVICE_ID in(1, 2, 4));`);
}


module.exports = { up, down };
