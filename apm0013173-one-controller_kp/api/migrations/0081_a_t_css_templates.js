/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
  return queryInterface.changeColumn(
      'CSS_TEMPLATES',
      'NAME', {
          type: Sequelize.STRING(120),
          allowNull: false
      }
  );
}

/**
* @param {import("sequelize").QueryInterface} queryInterface
* @param {import("sequelize").DataTypes} Sequelize
*/
function down(queryInterface, Sequelize) {
  return queryInterface.changeColumn(
    'CSS_TEMPLATES',
    'NAME', {
        type: Sequelize.STRING(60),
        allowNull: false
    }
);
}

module.exports = { up, down };
