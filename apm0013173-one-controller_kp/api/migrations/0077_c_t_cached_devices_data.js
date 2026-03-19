/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_CACHED_DEVICES_DATA", {
    ID: {
      type: Sequelize.STRING(20),
      primaryKey: true,
      unique: true,
      allowNull: false
    },
    HOSTNAME: {
      type: Sequelize.STRING(100)
    },
    TYPE: {
      type: Sequelize.STRING(100),
    },
    CATEGORY: {
      type: Sequelize.STRING(100),
    },
    PARTNUM: {
      type: Sequelize.STRING(100),
    },
    VENDOR: {
      type: Sequelize.STRING(100),
    },
    SERVICE: {
      type: Sequelize.STRING(100),
    },
    ADDRESS: {
      type: Sequelize.STRING(255),
    },
    CITY: {
      type: Sequelize.STRING(100),
    },
    STATE: {
      type: Sequelize.STRING(100),
    },
    ZIP: {
      type: Sequelize.STRING(100),
    },
    COUNTRY: {
      type: Sequelize.STRING(100),
    },
    GRUA: {
      type: Sequelize.STRING(10),
    },
    SERVICE_NAME: {
      type: Sequelize.STRING(100),
    },
    DATA_SRC: {
        type: Sequelize.STRING(100)
    },
    CACHING_FN: {
        type: Sequelize.STRING(100)
    },
    // Timestamps
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE
  });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
  return queryInterface.dropTable("CSS_CACHED_DEVICES_DATA");
}

module.exports = { up, down };
