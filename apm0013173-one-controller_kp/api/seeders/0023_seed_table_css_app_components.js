/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.bulkInsert(
    "CSS_APP_COMPONENTS",
    [
      {
        ID: 1,
        KEY: "0",
        NAME: "Actions",
        TYPE: "folder"
      },
      {
        ID: 2,
        KEY: "0-0",
        NAME: "Actions (*.*)",
        TYPE: "url"
      },
      {
        ID: 3,
        KEY: "1",
        NAME: "Configuration Templates",
        TYPE: "folder"
      },
      {
        ID: 4,
        KEY: "1-0",
        NAME: "Configuration Templates (*.*)",
        TYPE: "url"
      },
      {
        ID: 5,
        KEY: "2",
        NAME: "Administration UI",
        TYPE: "folder"
      },
      {
        ID: 6,
        KEY: "2-0",
        NAME: "Administration UI (*.*)",
        TYPE: "url"
      },
      {
        ID: 7,
        KEY: "2-1",
        NAME: "Customer Manager",
        TYPE: "url"
      },
      {
        ID: 8,
        KEY: "2-2",
        NAME: "Service Manager",
        TYPE: "url"
      },
      {
        ID: 9,
        KEY: "2-3",
        NAME: "Settings Manager",
        TYPE: "url"
      },
      {
        ID: 10,
        KEY: "3",
        NAME: "Monitor",
        TYPE: "folder"
      },
      {
        ID: 11,
        KEY: "3-0",
        NAME: "Monitor (*.*)",
        TYPE: "url"
      },
      {
        ID: 12,
        KEY: "4",
        NAME: "Configuration Audit",
        TYPE: "folder"
      },
      {
        ID: 13,
        KEY: "4-0",
        NAME: "Configuration Audit (*.*)",
        TYPE: "url"
      },
      {
        ID: 14,
        KEY: "5",
        NAME: "Access Control",
        TYPE: "folder"
      },
      {
        ID: 15,
        KEY: "5-0",
        NAME: "Access Control (*.*)",
        TYPE: "url"
      },
    ],
    {}
  );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
  return queryInterface.bulkDelete(
    "CSS_APP_COMPONENTS",
    {
      ID: { [Op.in]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
    },
    {}
  );
}

module.exports = { up, down };
