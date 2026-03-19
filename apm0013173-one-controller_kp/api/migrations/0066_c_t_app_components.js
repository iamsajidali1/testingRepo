/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_APP_COMPONENTS", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    KEY: {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: false,
    },
    NAME: Sequelize.STRING(255),
    TYPE: Sequelize.STRING(100)
  });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
  return queryInterface.dropTable("CSS_APP_COMPONENTS");
}

module.exports = { up, down };
