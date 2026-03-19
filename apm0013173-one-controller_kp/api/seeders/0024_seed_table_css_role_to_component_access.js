/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.bulkInsert(
    "CSS_ROLE_TO_COMPONENT_ACCESS",
    [
      {
        ID: 1,
        ROLE_ID: 3,
        COMPONENT_KEY: "0",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 2,
        ROLE_ID: 3,
        COMPONENT_KEY: "0-0",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 3,
        ROLE_ID: 3,
        COMPONENT_KEY: "1",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 4,
        ROLE_ID: 3,
        COMPONENT_KEY: "1-0",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 5,
        ROLE_ID: 3,
        COMPONENT_KEY: "2",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 6,
        ROLE_ID: 3,
        COMPONENT_KEY: "2-0",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 7,
        ROLE_ID: 3,
        COMPONENT_KEY: "2-1",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 8,
        ROLE_ID: 3,
        COMPONENT_KEY: "2-2",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 9,
        ROLE_ID: 3,
        COMPONENT_KEY: "2-3",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 10,
        ROLE_ID: 3,
        COMPONENT_KEY: "3",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 11,
        ROLE_ID: 3,
        COMPONENT_KEY: "3-0",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 12,
        ROLE_ID: 3,
        COMPONENT_KEY: "4",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 13,
        ROLE_ID: 3,
        COMPONENT_KEY: "4-0",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 14,
        ROLE_ID: 3,
        COMPONENT_KEY: "5",
        ACCESS_TYPE: "RW",
      },
      {
        ID: 15,
        ROLE_ID: 3,
        COMPONENT_KEY: "5-0",
        ACCESS_TYPE: "RW",
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
    "CSS_ROLE_TO_COMPONENT_ACCESS",
    {
      ID: { [Op.in]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
    },
    {}
  );
}

module.exports = { up, down };
