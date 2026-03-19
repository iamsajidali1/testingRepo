const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const AtomicOperationsVendorTypes = oneConnection.define(
  "AtomicOperationsVendorTypes",
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
    VENDOR_TYPE_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_CONF_TEMPLATE_VENDOR_TYPES",
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
    tableName: "CSS_ATOMIC_OPERATIONS_VENDOR_TYPES",
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["ATOMIC_OPERATION_ID", "VENDOR_TYPE_ID"],
        name: "atomic_op_vendor_unique",
      },
    ],
  }
);

module.exports = { AtomicOperationsVendorTypes };
