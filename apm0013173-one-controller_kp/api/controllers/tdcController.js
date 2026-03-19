/* eslint-disable camelcase, max-len, max-lines-per-function, max-statements, max-lines, prefer-named-capture-group, no-await-in-loop */

const { getLogger } = require("../../utils/logging");
const loggerPino = require("../helpers/loggerHelper");
const {
    ok,
    internalServerError,
    badRequest,
    notFound,
    serviceUnavailable,
    forbidden
} = require("../statuses");
const { TDCData } = require("../models/tdcDataModel");
const { Op } = require("sequelize");
const { fetchGeoLocations } = require("./geoLocationController");
const { getCustomerByBcCompanyId } = require("./customerController");
const { EricksonSite } = require("../models/ericksonSiteModel");
const { Organization } = require("../models/organizationModel");
const { ProductOrder } = require("../models/productOrderModel");
const { GeographicalLocation } = require("../models/geographicalLocationModel");
const { GeographicalSite } = require("../models/geographicalSiteModel");
const { GeographicalAddress } = require("../models/geographicalAddressModel");

const { "stringify": str } = JSON;

class NotFoundError extends Error { }
class BadRequestError extends Error { }

/**
 * To test the oAuth, if the request reaches here means the Authentication is Successful
 * @param {*} req
 * @param {*} res
 * @returns
 */
const testAuth = (req, res) => res.status(ok).json({
    "status": "OK",
    "statusCode": ok,
    "message": "Successfully authenticated using oAuth Client Credentials!"
});

/**
 * To run through the TDC Data Table and check if the GeoLoc is correct/valid
 * if not, goto Bing and fetch the Lat and ong for the address
 */
const updateGeoLocations = async () => {
    const log = getLogger();
    const oneConnection = require("../models/databaseOne").Database.getInstance();
    try {
        log.info("Fetching TDC Records");
        const tdcData = await TDCData.findAll({
            "attributes": [
                "ID"
            ],
            include: {
                model: GeographicalSite,
                include: [
                    {
                        model: GeographicalLocation,
                        as: "GeographicalLocation",
                    },
                    {
                        model: GeographicalAddress,
                        as: "GeographicalAddress",
                    }
                ]
            },
        });
        // Filter out guys that does not have valid lat long.
        log.info("Filter out records that does not have valid lat long");
        const tdcDataWithMissingGeoLoc = tdcData.filter((item) => {
            const latlon = `${item.GeographicalSite.GeographicalLocation?.LATITUDE?.trim()}, ${item.GeographicalSite.GeographicalLocation?.LONGITUDE.trim()}`;
            return !(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/u).test(latlon);
        });
        log.info("Fetch geoloc for records that does not have valid lat long");
        const locData = await fetchGeoLocations(tdcDataWithMissingGeoLoc);
        log.info("Update TDC records that does not have valid lat long");
        let updated = 0;
        await oneConnection.transaction({ "autocommit": true }, async (transaction) => {
            for (const [index, item] of tdcDataWithMissingGeoLoc.entries()) {
                if (!locData[index]) {
                    continue;
                }
                await GeographicalLocation.update({ LATITUDE: locData[index].lat, LONGITUDE: locData[index].lon }, {
                    where: {
                        ID: item.GeographicalSite.GeographicalLocation.ID
                    }
                })
                updated++;
            }
        });
        log.info(`Updated inventory with correct GeoLc for ${updated} records`);
    } catch (error) {
        log.error("Something went wrong while updating the geolocations for TDC Data");
        log.error(error.message);
    }
};


/**
 * To add records to TDC Data Table
 * @param {*} req expecting an array of information regarcing a site
 * @param {*} res
 * @returns
 */
const addTdcRecords = async (req, res) => {
    const log = getLogger();
    try {
        // Get data from SNOW to fill table for actual technical data collections
        const data = req.body;
        if (!data || !data.length) {
            return res.status(ok).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "Expecting an array of data, recieved none or empty!"
            });
        }
        log.info("Filtering records and mapping them");
        const recordsToInsert = [];
        const recordsWithErrors = [];
        data.forEach((item, index) => {
            const { device, callback_url, sr, templateId, grua } = item;
            // Check Errors
            if (!device || !callback_url || !sr || !templateId || !grua) {
                // Some error is there in this item
                const error = { index, "errors": [] };
                if (!device) {
                    error.errors.push(
                        "Mandatory field 'device' is missing or has wrong value!"
                    );
                }
                if (!callback_url) {
                    error.errors.push(
                        "Mandatory field 'callback_url' is missing or has wrong value!"
                    );
                }
                if (!sr) {
                    error.errors.push(
                        "Mandatory field 'sr' is missing or has wrong value!"
                    );
                }
                if (!templateId) {
                    error.errors.push(
                        "Mandatory field 'templateId' is missing or has wrong value!"
                    );
                }
                if (!grua) {
                    error.errors.push(
                        "Mandatory field 'grua' is missing or has wrong value!"
                    );
                }
                recordsWithErrors.push(error);
                return;
            }

            const {
                address_line_1,
                address_line_2,
                address_line_3,
                address_line_4,
                address_line_5
            } = item.address;
            let street = "";
            if (address_line_1) {
                street += address_line_1;
            }
            if (address_line_2) {
                street += `, ${address_line_2}`;
            }
            if (address_line_3) {
                street += `, ${address_line_3}`;
            }
            if (address_line_4) {
                street += `, ${address_line_4}`;
            }
            if (address_line_5) {
                street += `, ${address_line_5}`;
            }

            // Prepare GeoLoc
            const { latitude, longitude } = item.address;
            // Filter Data with no Errors
            const record = {
                "DEVICE": device,
                "ProductOrder": {
                    "EXTERNAL_ID": sr
                },
                "TEMPLATE_ID": Number(templateId),
                "ORGANIZATION": {
                    "GRUA": grua
                },
                "CALLBACK_URL": callback_url,
                "GeographicalSite": {
                    NAME: "-",
                    GeographicalAddress: {
                        STREET_NAME: street,
                        CITY: item.address.city,
                        STATE: item.address.state_province,
                        COUNTRY: item.address.country,
                        ZIP: item.address.zip
                    },
                    GeographicalLocation: {
                        LATITUDE: latitude,
                        LONGITUDE: longitude
                    },
                }
            };

            // Prepare Address

            recordsToInsert.push(record);
        });

        if (recordsWithErrors && recordsWithErrors.length) {
            return res.status(ok).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "There are some errors with the data, please refer errors!",
                "errors": recordsWithErrors
            });
        }

        const oneConnection = require("../models/databaseOne").Database.getInstance();
        await oneConnection.transaction(
            { "autocommit": true },
            async (transaction) => {
                for (const record of recordsToInsert) {
                    // Find out if there is any exusting record
                    log.info(`${str(record.DEVICE)}: Get or Create Organization`);

                    record.ORGANIZATION_ID = await getOrCreateOrganization(record.ORGANIZATION.GRUA, transaction);
                    record.GeographicalSite.ORGANIZATION_ID = record.ORGANIZATION_ID;
                    delete record.ORGANIZATION;

                    log.info(`${str(record.DEVICE)}: Checking if there is any existing record`);
                    const existingRecord = await TDCData.findOne({
                        "where": { "DEVICE": record.DEVICE }, transaction, "raw": true, include: [
                            {
                                model: ProductOrder,
                                as: "ProductOrder",
                                required: false
                            },
                            {
                                model: Organization,
                                as: "ORGANIZATION",
                                required: false
                            },
                            {
                                model: GeographicalSite,
                                as: "GeographicalSite",
                                required: false,
                                include: [
                                    {
                                        model: GeographicalAddress,
                                        as: "GeographicalAddress",
                                        required: false,
                                    },
                                    {
                                        model: GeographicalLocation,
                                        as: "GeographicalLocation",
                                        required: false,
                                    }
                                ]
                            }
                        ]
                    });
                    if (existingRecord) {
                        log.info(`${str(record.DEVICE)}: A record exists with TDC ID ${str(existingRecord.ID)}`);

                        /*
                         * Check if the existing status is Completed and Template has been changed...
                         * Then change the status back to In Progress
                         */
                        if (existingRecord.TEMPLATE_ID !== record.TEMPLATE_ID && existingRecord.STATUS === "Completed") {
                            log.info(`${str(record.DEVICE)}: Template has been changed from ${str(existingRecord.TEMPLATE_ID)} to ${str(record.TEMPLATE_ID)}`);
                            log.info(`${str(record.DEVICE)}: Changing the status from 'Completed' to 'In Progress'`);
                            record.STATUS = "In Progress";
                        }
                        log.info(`${str(record.DEVICE)}: Updating the record`);
                        await TDCData.update(record, {
                            "where": { "DEVICE": record.DEVICE }, transaction
                        });

                        if (existingRecord.PRODUCT_ORDER_ID) {
                            await ProductOrder.update(record.ProductOrder, {
                                where: { ID: existingRecord.PRODUCT_ORDER_ID },
                                transaction
                            });
                        }

                        if (existingRecord?.GeographicalSite) {
                            await GeographicalSite.update({
                                ORGANIZATION_ID: record.ORGANIZATION_ID
                            }, { where: { ID: existingRecord.GeographicalSite.ID } }, transaction)
                        }

                        if (existingRecord?.GeographicalSite?.GeographicalLocation && record.GeographicalSite?.GeographicalLocation) {
                            await GeographicalLocation.update(record.GeographicalSite.GeographicalLocation, {
                                where: { ID: existingRecord.GeographicalSite.GeographicalLocation.ID },
                                transaction
                            })
                        }

                        if (existingRecord?.GeographicalSite?.GeographicalAddress && record.GeographicalSite?.GeographicalAddress) {
                            await GeographicalAddress.update(record.GeographicalSite.GeographicalAddress, {
                                where: { ID: existingRecord.GeographicalSite.GeographicalAddress.ID },
                                transaction
                            })
                        }

                    } else {
                        log.info(`${str(record.DEVICE)}: It's a brand new site, create new record`);
                        await TDCData.create(record, {
                            include: [
                                {
                                    model: ProductOrder,
                                    as: "ProductOrder"
                                },
                                {
                                    model: GeographicalSite,
                                    as: "GeographicalSite",
                                    include: [
                                        {
                                            model: GeographicalAddress,
                                            as: "GeographicalAddress"
                                        },
                                        {
                                            model: GeographicalLocation,
                                            as: "GeographicalLocation"
                                        }
                                    ]
                                }
                            ]
                        }, transaction);
                    }
                }
            }
        );
        updateGeoLocations();
        return res.status(ok).send({
            "status": "Success",
            "statusCode": ok,
            "message": "TDC data created successfully!"
        });
    } catch (err) {
        loggerPino.error(err);
        return res.status(internalServerError).send({
            "status": "Failure",
            "statusCode": internalServerError,
            "message":
                "Error occured while creating technical data collection records!"
        });
    }
};

/**
 * Fetches Technical Data Collection (TDC) data for a given customer ID.
 *
 * @param {number} customerId - The ID of the customer.
 * @returns {Promise<Object[]>} - A promise that resolves to an array of TDC data objects.
 * @throws {BadRequestError} - If the customer ID is missing.
 * @throws {NotFoundError} - If no GRUA data or TDC data is found for the customer.
 * @throws {Error} - If an error occurs while fetching the TDC data.
 */
const getTDCDataByCustomerId = async (customerId) => {
    const log = getLogger();
    log.info(`Fetching TDC data for customer ID: ${str(customerId)}`);

    if (!customerId) {
        log.error("Customer ID is missing");
        throw new BadRequestError("Expecting an id of customer!");
    }

    try {
        const countries = require("i18n-iso-countries");
        const { Customers } = require("../models/customerOneModel");
        const { GruaDataToCustomer } = require("../models/gruaDataToCustomerModel");
        const { GruaData } = require("../models/gruaDataModel");

        // Finding GRUA for chosen customer
        log.info(`Finding GRUA for customer ID: ${str(customerId)}`);
        const customerGrua = await Customers.findOne({
            include: [
                {
                    model: GruaDataToCustomer,
                    required: true,
                    include: [
                        {
                            model: GruaData,
                            required: true
                        }
                    ]
                }
            ],
            where: { ID: customerId }
        });

        if (!customerGrua) {
            log.error(`GRUA for customer ID: ${str(customerId)} is missing`);
            throw new NotFoundError("GRUA for chosen customer is missing!");
        }

        const customerGruaData = customerGrua.dataValues.GruaDataToCustomers.map((data) => data.dataValues.GruaDatum.dataValues.GRUA);
        const { Templates } = require("../models/templatesDataModel");

        log.info(`Fetching TDC data for customer GRUA: ${str(customerGruaData)}`);
        const tdcData = await TDCData.findAll({
            attributes: { exclude: ["CALLBACK_URL", "DEVICE_JSON_BLOB"] },
            include: [
                {
                    model: Templates,
                    as: "TEMPLATE",
                    required: true,
                    attributes: ["ID", "NAME", "DESCRIPTION"]
                },
                {
                    model: Organization,
                    as: "ORGANIZATION",
                    required: true,
                    attributes: ["ID", "GRUA"],
                    where: {
                        GRUA: customerGruaData
                    }
                },
                {
                    model: ProductOrder,
                    as: "ProductOrder",
                    required: true,
                    attributes: ["ID", "EXTERNAL_ID", "STATUS"],
                    where: {
                        STATUS: { [Op.not]: "delete" }
                    }
                },
                {
                    model: GeographicalSite,
                    as: "GeographicalSite",
                    include: [
                        {
                            model: GeographicalAddress,
                            as: "GeographicalAddress"
                        },
                        {
                            model: GeographicalLocation,
                            as: "GeographicalLocation"
                        }
                    ]
                }
            ],
            order: [["ID", "DESC"]]
        });

        if (!tdcData.length) {
            log.error("No technical data collection record found");
            throw new NotFoundError("No technical data collection record found");
        }

        // Add Country Code
        log.info("Processing TDC data records");
        const sites = tdcData.map((site) => {
            const { ID, DEVICE, TEMPLATE_ID, TEMPLATE, ORGANIZATION_ID, STATUS, CREATE_DATE, UPDATE_DATE } = site.dataValues;
            const { STREET_NAME: STREET, CITY, COUNTRY, STATE, ZIP } = site.GeographicalSite.GeographicalAddress;
            const { LATITUDE, LONGITUDE } = site.GeographicalSite.GeographicalLocation;
            const { EXTERNAL_ID, STATUS: SNOW_STATUS } = site.ProductOrder;

            return {
                ID,
                DEVICE,
                TEMPLATE_ID,
                TEMPLATE: TEMPLATE.dataValues,
                ORGANIZATION_ID,
                STATUS,
                SR: EXTERNAL_ID,
                SNOW_STATUS,
                ADDRESS: {
                    STREET,
                    CITY,
                    COUNTRY,
                    COUNTRY_CODE: countries.getAlpha2Code(COUNTRY, "en"),
                    STATE,
                    ZIP,
                    LONGITUDE,
                    LATITUDE
                },
                CREATE_DATE,
                UPDATE_DATE
            };
        });

        log.info(`Successfully fetched TDC data for customer ID: ${str(customerId)}`);
        return sites;
    } catch (error) {
        log.error(`Error fetching TDC data for customer ID: ${str(customerId)}: ${str(error.message)}`);
        throw error;
    }
};


/**
 * Retrieves TDC data based on the customer ID provided in the request query.
 * If the request is coming from the Business Center, access is forbidden.
 * 
 * @param {Object} req - The request object.
 * @param {Object} req.query - The query parameters of the request.
 * @param {string} req.query.customerId - The ID of the customer.
 * @param {boolean} req.isBcUser - Flag indicating if the request is from Business Center.
 * @param {Object} res - The response object.
 * 
 * @returns {Promise<void>} - Returns a promise that resolves to void.
 */
const getTDCData = async (req, res) => {
    const log = getLogger();
    try {
        // Check if the request is coming from business center
        if (req.isBcUser) {
            log.info("Request is coming from Business Center");
            return res.status(forbidden).send({
                "status": "Forbidden",
                "statusCode": forbidden,
                "message": "You are not allowed to access this resource"
            })
        }

        // Grab the customer Id uf passed with request
        let { customerId } = req.query;
        if (!customerId) {
            return res.status(ok).send({
                "status": "BadRequest",
                "statusCode": badRequest,
                "message": "Expecting an id of customer!"
            });
        }
        const sites = await getTDCDataByCustomerId(customerId);
        return res.status(ok).json(sites);
    } catch (err) {
        const { message } = err;
        log.error(message);
        if (err instanceof BadRequestError) {
            return res.status(badRequest).json({ status: "BadRequest", statusCode: badRequest, message });
        }
        if (err instanceof NotFoundError) {
            return res.status(notFound).json({ status: "NotFound", statusCode: notFound, message });
        }
        return res.status(serviceUnavailable).json({
            "status": "Failure",
            "statusCode": serviceUnavailable,
            "message": "There is a problem fetching technical data collection data!"
        });
    }
};


/**
 * Retrieves TDC (Technical Data Collection) data for a Business Center user.
 * 
 * @param {Object} req - The request object.
 * @param {number} req.ebizCompanyId - The eBiz company ID.
 * @param {boolean} req.isBcUser - Flag indicating if the request is from a Business Center user.
 * @param {Object} res - The response object.
 * 
 * @returns {Promise<void>} - A promise that resolves to void.
 */
const getTDCDataForBcUser = async (req, res) => {
    const log = getLogger();
    try {
        // Check if the request is coming from business center
        if (!req.isBcUser) {
            log.error("Request is not coming from Business Center");
            return res.status(forbidden).send({
                "status": "Forbidden",
                "statusCode": forbidden,
                "message": "You are not allowed to access this resource"
            })
        }

        const { ebizCompanyId } = req;
        const { id } = await getCustomerByBcCompanyId(ebizCompanyId);

        const sites = await getTDCDataByCustomerId(id);
        return res.status(ok).json(sites.map((site) => ({
            ...site,
            // Make sure to Encode DEVICE and ADDRESS
            DEVICE: Buffer.from(site.DEVICE).toString("base64"),
            ADDRESS: Buffer.from(JSON.stringify(site.ADDRESS)).toString("base64")
        })));
    } catch (err) {
        const { message } = err;
        log.error(message);
        if (err instanceof BadRequestError) {
            return res.status(badRequest).json({ status: "BadRequest", statusCode: badRequest, message });
        }
        if (err instanceof NotFoundError) {
            return res.status(notFound).json({ status: "NotFound", statusCode: notFound, message });
        }
        return res.status(serviceUnavailable).json({
            "status": "Failure",
            "statusCode": serviceUnavailable,
            "message": "There is a problem fetching technical data collection data!"
        });
    }
}

/**
 * To Update the TDC Enabled? Status
 * @param {String} action enable/disble/delete
 * @param {*} data
 */
const changeTDCEnabledStatus = async (action, data) => {
    const oneConnection = require("../models/databaseOne").Database.getInstance();
    // Check if workflow exist in DB
    const tdcData = await TDCData.findOne({
        "where": { "DEVICE": data.deviceId, "ORGANIZATION.GRUA": data.grua },
        "include": {
            "model": Organization,
            "as": "ORGANIZATION",
            "required": true,
            "attributes": ["ID", "GRUA"]
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new NotFoundError(
            "Technical data collection with requested data is missing!"
        );
    });
    if (tdcData?.PRODUCT_ORDER_ID) {
        await oneConnection.transaction({ "autocommit": true }, async (transaction) => {
            await ProductOrder.update(
                { "STATUS": action },
                { "where": { "ID": tdcData.PRODUCT_ORDER_ID } },
                { transaction }
            );

            return {
                "status": "Success!",
                "statusCode": ok,
                "message": "Technical data collection status was updated"
            };
        });
    } else {
        throw new NotFoundError(
            "Technical data collection with requested data is missing!"
        );
    }
};

/**
 * To update a record in TDC Table
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateTDCData = async (req, res) => {
    try {
        const { body } = req;
        if (!body || !("action" in body)) {
            return res.status(badRequest).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "Mandatory action field is missing or payload is empty!"
            });
        }

        // We don't accept anything other than 'enable', 'disable' or 'delete'
        if (!["enable", "disable", "delete"].includes(body.action)) {
            return res.status(badRequest).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "We are expecting the action to be 'enable', 'disable' or 'delete'!"
            });
        }
        const { action, data } = body;
        if (!("tdcId" in data) || !("deviceId" in data) || !("grua" in data)) {
            return res.status(badRequest).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "Any of the following fields are missing - 'tdcId', 'deviceId', 'grua'!"
            });
        }
        await changeTDCEnabledStatus(action, data);
        return res.status(ok).send({
            "status": "Success",
            "statusCode": ok,
            "message": "TDC data updated successfully!"
        });
    } catch (err) {
        loggerPino.error(err);
        return res.status(internalServerError).send({
            "status": "Failure",
            "statusCode": internalServerError,
            "message": err.message
        });
    }
};

/**
 * Add Erickson Orchestrator data to TDC Entry
 * @param {*} req
 * @param {*} res
 * @returns
 */
const patchTDCData = async (req, res) => {
    try {
        const { body } = req;
        if (!body || (!("erickson_site" in body) && !("device" in body))) {
            return res.status(badRequest).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "Mandatory erickson_site / device field is missing or payload is empty!"
            });
        }

        // TODO: Better validation once the full table structure is implemented
        if (Object.keys(body).some(key => !['erickson_site', 'device'].includes(key))) {
            return res.status(badRequest).send({
                "status": "Failure",
                "statusCode": badRequest,
                "message": "Invalid payload, only erickson_site / device fields are allowed!"
            });
        }

        const tdcData = await TDCData.findOne({
            "where": { "DEVICE": req.params.deviceId }
        });

        if (!tdcData) {
            return res.status(badRequest).send({
                "status": "Failure",
                "statusCode": notFound,
                "message": "Invalid Device ID / hostname provided!"
            });
        }

        // We don't accept anything other than 'enable', 'disable' or 'delete'
        if (body.device) {
            await TDCData.update(
                { "DEVICE_JSON_BLOB": (body.device) },
                { "where": { "ID": tdcData.ID } },
            );
        }

        if (body.erickson_site) {
            const existing = await EricksonSite.findOne({ where: { SITE_ID: body.erickson_site.site_id } });

            if (existing) {
                await EricksonSite.update({
                    SITE_NAME: body.erickson_site.site_name
                }, {
                    where: {
                        id: existing.ID
                    }
                })
            } else {
                await EricksonSite.create({
                    SITE_NAME: body.erickson_site.site_name,
                    SITE_ID: body.erickson_site.site_id
                })
            }
        }

        const updatedTdcData = await TDCData.findOne({
            "where": { "DEVICE": req.params.deviceId },
            include: [{
                "model": Organization,
                "as": "ORGANIZATION",
                "required": true,
                "attributes": ["ID", "GRUA"]
            }, {
                model: ProductOrder,
                required: false,
                attributes: ["EXTERNAL_ID", "STATUS"]
            }, {
                model: GeographicalSite,
                as: "GeographicalSite",
                required: true,
                include: [
                    {
                        model: GeographicalAddress,
                        as: "GeographicalAddress",
                        required: true,
                    },
                    {
                        model: GeographicalLocation,
                        as: "GeographicalLocation",
                        required: true,
                    }
                ]
            }]
        });

        const device = updatedTdcData.DEVICE_JSON_BLOB;
        if (device) {
            device.hostname = req.params.deviceId;
        }

        return res.status(ok).send({
            device,
            address: {
                street: updatedTdcData.GeographicalSite.GeographicalAddress.STREET_NAME,
                city: updatedTdcData.GeographicalSite.GeographicalAddress.CITY,
                country: updatedTdcData.GeographicalSite.GeographicalAddress.COUNTRY,
                state_province: updatedTdcData.GeographicalSite.GeographicalAddress.STATE,
                zip: updatedTdcData.GeographicalSite.GeographicalAddress.ZIP,
                longitude: updatedTdcData.GeographicalSite.GeographicalLocation.LONGITUDE,
                latitude: updatedTdcData.GeographicalSite.GeographicalLocation.LATITUDE
            },
            erickson_site: body.erickson_site,
            callback_url: updatedTdcData.CALLBACK_URL,
            sr: updatedTdcData.ProductOrder?.EXTERNAL_ID,
            templateId: updatedTdcData.TEMPLATE_ID,
            grua: updatedTdcData.ORGANIZATION.GRUA
        });
    } catch (err) {
        loggerPino.error(err);
        return res.status(internalServerError).send({
            "status": "Failure",
            "statusCode": internalServerError,
            "message": err.message
        });
    }
};

async function getOrCreateOrganization(grua, transaction) {
    const organization = await Organization.findOne({
        where: {
            GRUA: grua
        }
    }, { transaction });

    if (organization) {
        return organization.ID;
    }

    const insertOrganization = await Organization.create({
        GRUA: grua,
    });

    return insertOrganization[0];
}

/*
 * TODO: CRON Job?
 * Update the Geolocations when the Conteainer Starts Up
 */
updateGeoLocations();

module.exports = {
    testAuth,
    addTdcRecords,
    getTDCData,
    getTDCDataForBcUser,
    changeTDCEnabledStatus,
    updateTDCData,
    patchTDCData
};
