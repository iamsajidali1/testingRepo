/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function up(queryInterface, Sequelize) {
    return queryInterface.bulkUpdate(
        'CSS_REPORT_SCHEDULES',
        { DATA: {
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
        "AADCUSMA272-V01-BOS-DCP",
        "AAAEUSCA007-V01-LAX-AE",
        "AAAPUSTX011-V01-AUS-ATO",
        "AAAPUSTN019-V01-BNA-ATO",
        "AAAPUSFL118-V01-MCO-ATO",
        "AAAPUSWA179-V01-SEA-ATO",
        "AAAPUSCA115-V01-SFO-ATO",
        "AAAPUSPA411-V01-PHL-ATO",
        "AAAPUSCO051-V01-DEN-ATO",
        "AAMEUSOK111-V01-TUL-MEO",
        "AAAPUSCA105-V01-LAX-ATO",
        "AAADINTE001-VM01-HYD-SSB" 
    ],
    "timeframe": "1",
    "orchestrator": {
        "url": "https://vco109-usca1.velocloud.net/",
        "tags": "level:MSP, management:ATT",
        "tenant_id": "275"
    }
} }, // new value
        { ID: 1 } // condition
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function down(queryInterface, Sequelize) {
    return queryInterface.bulkUpdate(
        'CSS_REPORT_SCHEDULES',
        { DATA: {
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
        "AADCUSMA272-V01-BOS-DCP",
        "AAAEUSCA007-V01-LAX-AE",
        "AAAPUSTX011-V01-AUS-ATO",
        "AAAPUSTN019-V01-BNA-ATO",
        "AAAPUSFL118-V01-MCO-ATO",
        "AAAPUSWA179-V01-SEA-ATO",
        "AAAPUSCA115-V01-SFO-ATO",
        "AAAPUSPA411-V01-PHL-ATO",
        "AAAPUSCO051-V01-DEN-ATO",
        "AAMEUSOK111-V01-TUL-MEO",
        "AAAPUSCA105-V01-LAX-ATO",
    ],
    "timeframe": "1",
    "orchestrator": {
        "url": "https://vco109-usca1.velocloud.net/",
        "tags": "level:MSP, management:ATT",
        "tenant_id": "275"
    }
} }, // revert to old value
        { ID: 1 }
    );
}

module.exports = { up, down };