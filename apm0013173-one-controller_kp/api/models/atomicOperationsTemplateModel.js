const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const AtomicOperationsTemplate = oneConnection.define(
  "atomicOperationsTemplate",
  {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    ATOMIC_OPERATION_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_ATOMIC_OPERATIONS",
        key: "ID",
      },
      allowNull: false,
    },
    TEMPLATE_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_TEMPLATES",
        key: "ID",
      },
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
    tableName: "CSS_ATOMIC_OPERATIONS_TEMPLATE",
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["ATOMIC_OPERATION_ID", "TEMPLATE_ID"],
        name: "atomic_op_template_unique",
      },
    ],
  }
);

module.exports = { AtomicOperationsTemplate };
