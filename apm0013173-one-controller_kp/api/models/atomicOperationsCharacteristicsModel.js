const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const AtomicOperationsCharacteristics = oneConnection.define(
  "AtomicOperationsCharacteristics",
  {
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
      allowNull: false,
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
  },
  {
    tableName: "CSS_ATOMIC_OPERATIONS_CHARACTERISTICS",
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["CHARACTERISTIC_ID", "ATOMIC_OPERATION_ID"],
        name: "char_atomic_op_unique",
      },
    ],
  }
);

module.exports = { AtomicOperationsCharacteristics };
