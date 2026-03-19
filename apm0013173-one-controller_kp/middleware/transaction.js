const constants = require("../api/constants");
const { unauthorized } = require("../api/statuses");

/**
 * @param {Request} req request
 * @param {Response} res response
 * @param {function} next next fn
 */
exports.transaction = async (req, res, next) => {
    const {
        checkDataForTransaction
    } = exports;
    const type = req.headers[constants.header_one_type];

    if (!(type === constants.one_type)) {
        req.body.actionData = null;
        return next();
    }

    // TODO change based on session middleware
    const  sessionId  = req.cookies["sessionId"];
    const checkData = await checkDataForTransaction(sessionId);
    const userID = req.user;

    if (checkData) {
        // Check attuid or bc id for selected user
        if (!checkData.user_id.localeCompare(userID)) {
            // Setup data for action
            req.body.actionData = checkData;
            return next();
        }
        return res.status(unauthorized)
            .send({ "message": "This action is unauthorized!" });
    }
    req.body.actionData = null;
    return next();
};

// Check transaction stored data on DB
exports.checkDataForTransaction = async (sessionId) => {
    require("../api/models/databaseOne").Database.getInstance();
    const { TransactionData } = require("../api/models/transactionDataModel");
    const transactionData = await TransactionData.findOne(
        {
            "where": {
                "SESSION_ID": sessionId,
                "IS_ACTIVE": true
            }
        }
    );
    if (transactionData && transactionData.dataValues &&
    transactionData.dataValues.ID) {
        const dbData = transactionData.dataValues.DATA
            ? transactionData.dataValues.DATA
            : null;
        return {
            "data": dbData,
            "user_id": transactionData.dataValues.USER_ID,
            "sessionId": transactionData.dataValues.SESSION_ID
        };
    }
    return null;
};
