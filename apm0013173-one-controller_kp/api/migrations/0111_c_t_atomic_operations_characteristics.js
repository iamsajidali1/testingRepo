/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ATOMIC_OPERATIONS_CHARACTERISTICS", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    CHARACTERISTIC_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_CHARACTERISTIC",
        key: "ID",
      },
    },
    ATOMIC_OPERATION_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_ATOMIC_OPERATIONS",
        key: "ID",
      },
    },
    VALUE: {
      type: Sequelize.STRING(100),
    },
  });
}
/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
  return queryInterface.dropTable("CSS_ATOMIC_OPERATIONS_CHARACTERISTICS");
}

module.exports = { up, down };
