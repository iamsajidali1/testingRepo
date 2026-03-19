/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ATOMIC_OPERATIONS_TYPES", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    NAME: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    DESCRIPTION: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    CREATE_DATE: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    UPDATE_DATE: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
  return queryInterface.dropTable("CSS_ATOMIC_OPERATIONS_TYPES");
}

module.exports = { up, down };
