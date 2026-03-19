/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function up(queryInterface) {
    return queryInterface.bulkInsert(
        'CSS_REPORT_SCHEDULES', [
        {
            ID: 1,
            NAME: "American Airlines - Utilization Report",
            ENDPOINT: "/report/utilisationMetrics",
            DATA: JSON.stringify({
                "orchestrator": {
                    "url": "https://vco109-usca1.velocloud.net/",
                    "tenant_id": "275",
                    "tags": "level:MSP, management:ATT"
                },
                "devices": [
                    "AADCUSOK036-V01-CDC-DCW",
                    "AADCUSOK036-V02-CDC-DCW",
                    "AADCUSCA800-V01-SJC-DCW",
                    "AADCUSCA800-V02-SJC-DCW",
                    "AADCUSTX018-V02-DFW-DCW",
                    "AADCUSTX018-V01-DFW-DCW",
                    "AADCUSVA800-V01-ASH-DCW",
                    "AADCUSVA800-V02-ASH-DCW",
                    "AADCUSMD022-V01-SBY-DCW",
                    "AADCUSMD022-V02-SBY-DCW",
                    "AADCUSTX018-V03-DFW-DCW",
                    "AADCUSTX018-V04-DFW-DCW",
                    "AADCUSOH403-V01-DAY-DCW",
                    "AADCUSOH403-V02-DAY-DCW",
                    "AADCUSILIDC-V01-ORD-DCW",
                    "AADCUSILIDC-V02-ORD-DCW",
                    "AADCUSMA272-V01-BOS-DCP"
                ],
                "timeframe": "1"
            }),
            SCHEDULE: "0 6 * * *",
            SEND_TO: "ta147p@att.com, mi449w@att.com"
        }
    ], {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        'CSS_REPORT_SCHEDULES', {
        ID: {
            [Sequelize.Op.eq]: 1
        }
    }, {}
    );
}


module.exports = { up, down };