const constants = require("../api/constants");
const loggerPino = require("../api/helpers/loggerHelper");
const steps = require("../api/steps");
const transactionStatuses = require("../api/transactionStatuses");
const { "v4": uuidv4 } = require("uuid");
let transactionId = "";

/**
 * @param {Request} req request
 * @param {Response} res response
 * @param {function} next next fn
 */
exports.dataHandler = async (req, res, next) => {
    const transactionDataHelper = require("../api/helpers/transactionDataHelper");
    const mcapController = require("../api/controllers/mcapController");
    const orchestratorController = require("../api/controllers/orchestratorController");

    const {
        checkWorkflowIdForActionTemplate,
        saveDataForTransaction,
        getServiceToCustomerId,
        updateTransactionData,
        verifyDeviceVendorType
    } = exports;
    const type = req.headers[constants.header_one_type];

    if (!(type === constants.one_type)) {
        req.body.actionData = null;
        return next();
    }

    try {
        if (req.body.permissionGranted && req.path === constants.transaction_path) {
            // TODO change based on session middleware
            const sessionId = req.cookies['sessionId'];
            const userID = req.user;
            const { actionId } = req.query;
            let customerId;
            if (req.ebizCompanyId) {
                customerId = await exports.findCustomerId(req.ebizCompanyId);
            } else {
                customerId = req.query.customerId;
            }
            const { serviceId } = req.query;
            const serviceToCustomerId = await getServiceToCustomerId(
                customerId,
                serviceId
            );
            const workflowId = await checkWorkflowIdForActionTemplate(actionId);
            let hostname = {
                "hostname": null,
                "dms_server": null
            };
            let deviceType = null;
            let mcapCredentialId = null;
            if (req.query.hostname) {
                const queryHostname = req.query.hostname.toLowerCase();
                mcapCredentialId = await transactionDataHelper.getMcapCredentials(
                    serviceToCustomerId
                );

                const hostnames = await mcapController.callGetHostnameAsPromise(
                    queryHostname
                );
                deviceType = await verifyDeviceVendorType(req, queryHostname);
                hostname = hostnames.find((element) => element.hostname.toLowerCase() == queryHostname);
            }
            let vcoUrl = null;
            if (req.query.vco_url) {
                const queryVcoUrl = req.query.vco_url.toLowerCase();
                const vcoUrls = await orchestratorController.getOrchestratorListHelper(
                    serviceToCustomerId
                );
                vcoUrl = vcoUrls.find(
                    (element) => element.url.toLowerCase() == queryVcoUrl
                );
            }
            let step = null;
            let status = null;
            if (req.query.dataCollection != "") {
                const dataCollection = exports.checkStepForTransaction(
                    req.query.dataCollection
                );
                if (dataCollection) {
                    step = dataCollection.step;
                    status = dataCollection.trStatus;
                }
            }
            if (workflowId && hostname && serviceToCustomerId) {
                const data = {
                    customerId,
                    serviceId,
                    serviceToCustomerId,
                    actionId,
                    "hostname": hostname.hostname,
                    "dms_server": hostname.dms_server,
                    deviceType,
                    workflowId,
                    mcapCredentialId,
                    vcoUrl,
                    step,
                    status
                };
                let transactionData;
                if (
                    req.query.dataCollection != "" &&
          constants.actionScreen === req.query.dataCollection
                ) {
                    transactionId = uuidv4();
                }
                if (!req.body.actionData) {
                    transactionData = await saveDataForTransaction(
                        sessionId,
                        userID,
                        data,
                        transactionId
                    );
                } else {
                    transactionData = await updateTransactionData(
                        sessionId,
                        userID,
                        data,
                        transactionId
                    );
                }
                if (transactionData) {
                    res.cookie("transactionId", transactionId);
                    return res.status(200).send({ "message": "Successful!" });
                }
                return res.status(500).send({ "message": "Internal server error!" });
            }
            return res.status(400).send({ "message": "Bad Request!" });
        }
        return next();
    } catch (error) {
        console.log(error);
        loggerPino.error(error);
        return res.status(500).send({ "message": "Internal server error!" });
    }
};

// Return workflow id for selected action template
exports.checkWorkflowIdForActionTemplate = async (actionTemplateId) => {
    require("../api/models/databaseOne").Database.getInstance();
    const {
        WorkFlowToTemplate
    } = require("../api/models/workflowToTemplateModel");
    const workflowToTemplate = await WorkFlowToTemplate.findOne({
        "where": { "TEMPLATE_ID": actionTemplateId }
    });
    if (workflowToTemplate && workflowToTemplate.dataValues) {
        return workflowToTemplate.dataValues.ID;
    }
    return null;
};

// Save transaction data to DB
exports.saveDataForTransaction = async (
    sessionId,
    userId,
    data,
    transactionId
) => {
    data.transactionId = transactionId;
    const oneConnection =
    require("../api/models/databaseOne").Database.getInstance();
    const result = await oneConnection.transaction(
        { "autocommit": true },
        async (t) => {
            const transactionData = await exports.insertTransactionData(
                data,
                sessionId,
                userId,
                t
            );
            return transactionData;
        }
    );
    return result;
};

// Update transaction data to DB
exports.updateTransactionData = async (
    sessionId,
    userId,
    data,
    transactionId
) => {
    data.transactionId = transactionId;
    const oneConnection =
    require("../api/models/databaseOne").Database.getInstance();
    const { TransactionData } = require("../api/models/transactionDataModel");
    const result = await oneConnection.transaction(
        { "autocommit": true },
        async (t) => {
            const savedTransaction = await TransactionData.findOne(
                {
                    "where": {
                        "SESSION_ID": sessionId,
                        "IS_ACTIVE": true
                    }
                },
                { "transaction": t }
            );
            if (!savedTransaction && !savedTransaction.ID) {
                return false;
            }

            const transactionData = await TransactionData.update(
                {
                    "IS_ACTIVE": false
                },
                {
                    "where": {
                        "ID": savedTransaction.ID
                    }
                },
                { "transaction": t }
            );
            if (!transactionData) {
                return false;
            }

            const newTransationData = await exports.insertTransactionData(
                data,
                savedTransaction.SESSION_ID,
                userId,
                t
            );
            return newTransationData;
        }
    );
    return result;
};

// Load service to customer ID
exports.getServiceToCustomerId = async (customerId, serviceId) => {
    const oneConnection =
    require("../api/models/databaseOne").Database.getInstance();
    const { ServiceToCustomer } = require("../api/models/serviceToCustomerModel");
    const serviceToCustomer = await ServiceToCustomer.findOne({
        "where": {
            "CUSTOMER_ID": customerId,
            "SERVICE_ID": serviceId
        }
    });
    if (serviceToCustomer && serviceToCustomer.dataValues) {
        return serviceToCustomer.dataValues.ID;
    }
    return null;
};

// Load vendor by device type
exports.verifyDeviceVendorType = async (req, queryHostname) => {
    const cacheController = require("../api/controllers/cacheDevicesController");
    const { CTVendorTypes } = require("../api/models/cTVendorTypes");
    let deviceType = null;
    try {
        const devices = await cacheController.getDevicesHelper(req);
        let deviceData = null;
        if (devices && devices.length > 0) {
            deviceData = devices.find((element) => element.HOSTNAME.toLowerCase() == queryHostname);
        }
        if (deviceData && deviceData.VENDOR) {
            const vendorTypeId = await CTVendorTypes.findOne({
                "where": {
                    "VENDOR_TYPE": deviceData.VENDOR
                }
            });

            if (
                vendorTypeId &&
        vendorTypeId.dataValues &&
        vendorTypeId.dataValues.ID
            ) {
                deviceType = vendorTypeId.dataValues.ID;
            }
        }
        return deviceType;
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Error in calling verifyDeviceVendorType function");
    }
};

exports.insertTransactionData = async (data, session, userId, t) => {
    const { TransactionData } = require("../api/models/transactionDataModel");
    return Boolean(
        await TransactionData.create(
            {
                "DATA": data,
                "SESSION_ID": session,
                "USER_ID": userId,
                "IS_ACTIVE": true
            },
            { "transaction": t }
        )
    );
};

exports.checkStepForTransaction = (dataCollection) => {
    switch (dataCollection) {
    case constants.actionScreen: {
        return {
            "step": steps.selectAction,
            "trStatus": transactionStatuses.changeNotCompleted
        };
    }
    case constants.dataCollection: {
        return {
            "step": steps.dataCollection,
            "trStatus": transactionStatuses.changeNotCompleted
        };
    }
    default: {
        return false;
    }
    }
};

exports.findCustomerId = async (ebizCompanyId) => {
    const { Customers } = require("../api/models/customerOneModel");
    try {
        const customer = await Customers.findOne({
            "where": { "BC_COMPANY_ID": ebizCompanyId }
        });
        if (customer) {
            return customer.dataValues.ID;
        }
        return -1;
    } catch (error) {
        loggerPino.error(error);
        return -1;
    }
};
