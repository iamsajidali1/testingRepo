const Sequelize = require("sequelize");
const { CONFIG } = require("../config/configuration");
const logger = require("../helpers/loggerHelper");
const { noContent, created } = require("../statuses");

const getLmacDbInsertQuery = (data) => {
    const now = new Date();
    const year = new Intl.DateTimeFormat("en", { "year": "numeric" }).format(now);
    const month = new Intl.DateTimeFormat("en", { "month": "2-digit" }).format(now);
    const day = new Intl.DateTimeFormat("en", { "day": "2-digit" }).format(now);
    const currentDate = `${year}-${month}-${day}`;
    return `
    INSERT INTO lmactable (
        TP1,
        Customer,
        CSM,
        Router,
        Poller,
        Comment,
        sls,
        owner,
        router_count,
        category,
        MACDSUBMITTEDTOFEC,
        MACDDESCRIPTION,
        assigned,
        weight,
        completed,
        created_by,
        att_for,
        lmac_for,
        vor,
        macd_service_id,
        router_count_sls
    )
    VALUES(
        '${data.transactionId}',
        '${data.customerName}',
        '${data.transactionId}',
        '${data.hostname}',
        NULL,
        'Automatic order creation from CSS/ONE',
        '${data.requester}',
        'CSS_1',
        '1',
        '128',
        '${currentDate}',
        '${data.actionName}',
        '${currentDate}',
        '0',
        '${currentDate}',
        'CSS_1',
        '${currentDate}',
        '${currentDate}',
        '${currentDate}',
        '1',
        '1'
    );`;
};

const insertIntoLmacDB = async (data) => {
    let connection = null;
    try {
        // Create a MySQL Connection to the LMAC DB
        const { lmacDB } = CONFIG;
        connection = new Sequelize(
            lmacDB.database,
            lmacDB.username,
            lmacDB.password,
            {
                "host": lmacDB.host,
                "port": lmacDB.port,
                "dialect": "mysql",
                "dialectOptions": { "ssl": { "rejectUnauthorized": false } }
            }
        );
        // Execute the Query
        logger.info("Executing query on LmacDB...");
        const query = getLmacDbInsertQuery(data);
        const result = await connection.query(query, {
            "type": Sequelize.QueryTypes.INSERT
        });
        return {
            "status": created,
            "message": "Change Request created Successfully!",
            "data": { "source": "LmacDB", "id": result[0] }
        };
    } catch (err) {
        logger.error(err);
        logger.info("Error in Executing query on LmacDB!!!");
        return null;
    } finally {
        // Close the MySQL Open Connection to LMACDB
        connection.close();
    }
};

const createCrForLmac = async (data) => {
    const { changeType, isBcUser, userDetails } = data;
    // Find out if the user belongs to Org
    const ngnsdOrgLeadAttUid = CONFIG.ngnsdOrgLeadAttUid;
    const isUnderOrg = userDetails && userDetails.hierarchy.split("|").includes(ngnsdOrgLeadAttUid);

    /*
     * Create CR only If
     * ActionType === Logical Change &&
     * (Requestor === From Business Center || ATTUid not in RH Org)
     */

    const shouldCreateCr = changeType === "Logical change" && (isBcUser || !isUnderOrg);
    if (shouldCreateCr) {
        return await insertIntoLmacDB(data);
    }
    // Else just return Null
    return {
        "status": noContent,
        "message": "Change Request is not created! Conditions do not match!"
    };
};

module.exports = { createCrForLmac };
