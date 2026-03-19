const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const AtomicOperations = oneConnection.define(
  "AtomicOperations",
  {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    NAME: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    TYPE: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_ATOMIC_OPERATIONS_TYPES",
        key: "ID",
      },
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
    tableName: "CSS_ATOMIC_OPERATIONS",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = { AtomicOperations };
