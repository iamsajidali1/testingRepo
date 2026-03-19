/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addConstraint(
            "CSS_ACTION_DATA_TO_SERVICE_TO_CUSTOMER", {
            fields: ["ACTION_DATA_ID", "SERVICE_TO_CUSTOMER_ID"],
            type: "unique",
            name: "action_data_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_GPS_DATA_TO_CUSTOMER", {
            fields: ["GPS_DATA_ID", "CUSTOMER_ID"],
            type: "unique",
            name: "gps_data_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_LEAM_DATA_TO_SERVICE_TO_CUSTOMER", {
            fields: ["LEAM_DATA_ID", "SERVICE_TO_CUSTOMER_ID"],
            type: "unique",
            name: "leam_data_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_MCAP_CREDENTIAL_TO_SERVICE_TO_CUSTOMER", {
            fields: ["MCAP_CREDENTIAL_ID", "SERVICE_TO_CUSTOMER_ID"],
            type: "unique",
            name: "mcap_cred_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_ORCHESTRATOR_LIST_TO_SERVICE_TO_CUSTOMER", {
            fields: ["ORCHESTRATOR_LIST_ID", "SERVICE_TO_CUSTOMER_ID"],
            type: "unique",
            name: "orchestrator_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_ROLE_TO_ACTION", {
            fields: ["ROLE_ID", "ACTION_ID"],
            type: "unique",
            name: "role_to_action"
        }),
        queryInterface.addConstraint(
            "CSS_ROLE_TO_SERVICE", {
            fields: ["ROLE_ID", "SERVICE_ID"],
            type: "unique",
            name: "role_to_s"
        }),
        queryInterface.addConstraint(
            "CSS_ROLE_TO_SERVICE_TO_CUSTOMER", {
            fields: ["ROLE_ID", "SERVICE_TO_CUSTOMER_ID"],
            type: "unique",
            name: "role_to_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_ROLE_TO_TEMPLATE", {
            fields: ["ROLE_ID", "TEMPLATE_ID"],
            type: "unique",
            name: "role_to_t"
        }),
        queryInterface.addConstraint(
            "CSS_SERVICE_TO_CUSTOMER", {
            fields: ["CUSTOMER_ID", "SERVICE_ID"],
            type: "unique",
            name: "service_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_SERVICE_TO_SERVICE_ATTRIBUTES", {
            fields: ["SERVICE_ATTRIBUTE_ID", "SERVICE_ID"],
            type: "unique",
            name: "service_to_s_a"
        }),
        queryInterface.addConstraint(
            "CSS_TEMPLATE_TO_SERVICE", {
            fields: ["TEMPLATE_ID", "SERVICE_ID"],
            type: "unique",
            name: "template_to_s"
        }),
        queryInterface.addConstraint(
            "CSS_TEMPLATE_TO_SERVICE_TO_CUSTOMER", {
            fields: ["TEMPLATE_ID", "SERVICE_TO_CUSTOMER_ID"],
            type: "unique",
            name: "template_to_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_TEMPLATE_TO_VENDOR", {
            fields: ["TEMPLATE_ID", "VENDOR_ID"],
            type: "unique",
            name: "template_to_v"
        }),
        queryInterface.addConstraint(
            "CSS_USER_TO_TEMPLATE", {
            fields: ["TEMPLATE_ID", "USER_ID"],
            type: "unique",
            name: "user_to_t"
        }),
        queryInterface.addConstraint(
            "CSS_USERS_TO_ROLES", {
            fields: ["ROLE_ID", "USER_ID"],
            type: "unique",
            name: "user_to_r"
        }),
        queryInterface.addConstraint(
            "CSS_USERS_TO_SERVICE", {
            fields: ["SERVICE_ID", "USER_ID"],
            type: "unique",
            name: "user_to_s"
        }),
        queryInterface.addConstraint(
            "CSS_USERS_TO_SERVICE_TO_CUSTOMER", {
            fields: ["SERVICE_TO_CUSTOMER_ID", "USER_ID"],
            type: "unique",
            name: "user_to_s_to_c"
        }),
        queryInterface.addConstraint(
            "CSS_WORKFLOW_TO_SERVICE", {
            fields: ["SERVICE_ID", "WORKFLOW_ID"],
            type: "unique",
            name: "workflow_to_s"
        }),
        queryInterface.addConstraint(
            "CSS_WORKFLOW_TO_TEMPLATE", {
            fields: ["WORKFLOW_ID", "TEMPLATE_ID"],
            type: "unique",
            name: "worfklow_to_t"
        })
    ]);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.removeConstraint(
            "CSS_ACTION_DATA_TO_SERVICE_TO_CUSTOMER",
            "action_data_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_GPS_DATA_TO_CUSTOMER",
            "gps_data_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_LEAM_DATA_TO_SERVICE_TO_CUSTOMER",
            "leam_data_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_MCAP_CREDENTIAL_TO_SERVICE_TO_CUSTOMER",
            "mcap_cred_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_ORCHESTRATOR_LIST_TO_SERVICE_TO_CUSTOMER",
            "orchestrator_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_ROLE_TO_ACTION",
            "role_to_action"
        ),
        queryInterface.removeConstraint(
            "CSS_ROLE_TO_SERVICE",
            "role_to_s"
        ),
        queryInterface.removeConstraint(
            "CSS_ROLE_TO_SERVICE_TO_CUSTOMER",
            "role_to_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_ROLE_TO_TEMPLATE",
            "role_to_t"
        ),
        queryInterface.removeConstraint(
            "CSS_SERVICE_TO_CUSTOMER",
            "service_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_SERVICE_TO_SERVICE_ATTRIBUTES",
            "service_to_s_a"
        ),
        queryInterface.removeConstraint(
            "CSS_TEMPLATE_TO_SERVICE",
            "template_to_s"
        ),
        queryInterface.removeConstraint(
            "CSS_TEMPLATE_TO_SERVICE_TO_CUSTOMER",
            "template_to_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_TEMPLATE_TO_VENDOR",
            "template_to_v"
        ),
        queryInterface.removeConstraint(
            "CSS_USER_TO_TEMPLATE",
            "user_to_t"
        ),
        queryInterface.removeConstraint(
            "CSS_USERS_TO_ROLES",
            "user_to_r"
        ),
        queryInterface.removeConstraint(
            "CSS_USERS_TO_SERVICE",
            "user_to_s"
        ),
        queryInterface.removeConstraint(
            "CSS_USERS_TO_SERVICE_TO_CUSTOMER",
            "user_to_s_to_c"
        ),
        queryInterface.removeConstraint(
            "CSS_WORKFLOW_TO_SERVICE",
            "workflow_to_s"
        ),
        queryInterface.removeConstraint(
            "CSS_WORKFLOW_TO_TEMPLATE",
            "worfklow_to_t"
        )
    ]);
}

module.exports = { up, down };
