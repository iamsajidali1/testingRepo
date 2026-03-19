const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const AtomicOperationsServices = oneConnection.define(
  "AtomicOperationsServices",
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
    SERVICE_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_SERVICES",
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
    tableName: "CSS_ATOMIC_OPERATIONS_SERVICES",
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["ATOMIC_OPERATION_ID", "SERVICE_ID"],
        name: "atomic_op_service_unique",
      },
    ],
  }
);

module.exports = { AtomicOperationsServices };
