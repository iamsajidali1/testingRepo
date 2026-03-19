const { Users } = require("../models/usersModel");
const oneConnection = require("../models/databaseOne").Database.getInstance();
const { check, validationResult, body, query } = require("express-validator");
const loggerPino = require("../helpers/loggerHelper");
const { CONFIG } = require("../config/configuration");
const axios = require('axios');
const { HttpsProxyAgent } = require("https-proxy-agent");
const constants = require("../constants");
const proxyServer = process.env.http_proxy || constants.proxyAttPxy;

exports.getBcUsers = function (req, res) {
    return Users.findAll()
        .then((users) => {
            let results = [];
            users.forEach((obj) => {
                if (obj.dataValues.BC_USER_ID != null) {
                    results.push({
                        ID: obj.dataValues.ID,
                        NAME: obj.dataValues.NAME,
                        ATTUID: obj.dataValues.ATTUID,
                        BC_USER_ID: obj.dataValues.BC_USER_ID
                    });
                }
            });
            return res.status(200).json(results);
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!" });
        });
}

exports.getUserByATTUID = [[
    query("attuid").trim(),
    check("attuid").isLength({ min: 1, max: 6 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ errors: errors });
    }
    Users.findOne({
        where: {
            ATTUID: req.query.attuid
        }
    }).then((response) => {
        if (response === null) {
            const result = {
                message: "Successful!",
                results: {}
            }
            return res.status(200).send(result);
        } else {
            const result = {
                message: "Successful!",
                results: response
            }
            return res.status(200).send(result);
        }
    }).catch(error => {
        loggerPino.error(error);
        return res.status(500).send({ message: "Database error" });
    });
}];

exports.getUsers = function (req, res) {
    Users.findAll()
        .then((users) => {
            let results = [];
            users.forEach((obj) => {
                if (obj.dataValues["BC_USER_ID"] == null) {
                    results.push({
                        ID: obj.dataValues.ID,
                        NAME: obj.dataValues.NAME,
                        ATTUID: obj.dataValues.ATTUID
                    });
                }
            })
            return res.status(200).json(results);
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Database error" });
        });
}

exports.checkUser = async (attuid) => {
    const users = await Users.findOne({
        where: {
            ATTUID: attuid
        }
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error!");
    });
    if (users && users["dataValues"]) {
        return true;
    } else {
        return false;
    }
}

exports.insertUser = async (user) => {
    return await oneConnection.transaction({ autocommit: true }, async function (t) {
        const users = await Users.create({
            NAME: user["name"],
            ATTUID: user["attuid"],
            BC_USER_ID: null
        }, { transaction: t }).catch(error => {
            loggerPino.error(error);
            throw new Error("Database error on create!");
        });
        return users;
    }).then(function (result) {
        return result;
    });
}

exports.syncUsers = async (req, res) => {
    try {
        let users = await exports.getUPMIndidvidualUsers(req);
        users = exports.parseUsers(users);
        users = await exports.checkUsersInDB(users);
        await exports.insertUserInDb(users);
        return res.status(200).send({ message: "Successfull updated!" });
    } catch (error) {
        loggerPino.error(error);
        if (error.message === "Internal server error from UPM!" ||
            error.message === "Unable to call UPM api!") {
            return res.status(503).send({ message: "UPM API service unavailable!" });
        } else if (error.message === "Client error!") {
            return res.status(400).send({ message: "Client error from UPM API!" });
        } else if (error.message === "Authentication required!") {
            return res.status(403).send({ message: "Forbidden by UPM API!" });
        } else if (error.message === "Unexcepted status code from UPM!" ||
            error.message === "Empty response from UPM!" ||
            error.message === "Database error when creating users!" ||
            error.message === "Database error when loading all users!") {
            return res.status(502).send({ message: error.message });
        }
    }
}

exports.getUPMIndidvidualUsers = async (req) => {
    const upmAppId = constants.upmAppID;
    const individualId = 3;
    const requestConfig = {
        url: `${CONFIG.UPM}/api/upm/v1/applications/${upmAppId}/levels/${individualId}/active-by-group`,
        method: 'get',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        proxy: false,
        httpsAgent: new HttpsProxyAgent(proxyServer)
    }

    let response = await axios(requestConfig).catch((error) => {
        loggerPino.error(error);
        throw new Error("Unable to call UPM api!");
    });

    if (response) {
        const result = response.data;
        if (response.status <= 299 && response.status >= 200) {
            return result["data"]["permissions"];
        }
        if (response.status > 499 && response.status < 599) {
            loggerPino.error("Internal server error from UPM!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(str(result));
            throw new Error("Internal server error from UPM!");
        } else if (response.status > 399 && response.status < 499) {
            loggerPino.error("Client error from UPM!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(str(result));
            if (response.status == 401) {
                throw new Error("Authentication required!");
            } else {
                throw new Error("Client error!");
            }
        } else {
            loggerPino.error("Incorrect UPM api status");
            loggerPino.info("Whole response of the request");
            loggerPino.info(str(result));
            throw new Error("Unexcepted status code from UPM!");
        }
    } else {
        loggerPino.error("Empty response from UPM!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Empty response from UPM!");
    }
}

// check existing users in DB
exports.checkUsersInDB = async (users) => {
    let checkedUser = await Users.findAll({}
    ).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error when loading all users!");
    });
    const result = users.filter(user => {
        const checkUser = ((usr) => usr["ATTUID"] == user["ATTUID"]);
        if (checkedUser.findIndex(checkUser) >= 0) {
            return false;
        } else {
            return true;
        }
    });
    return result;
}

// parse users to right format
exports.parseUsers = (users) => {
    parsedUsers = [];
    for (user of users) {
        parsedUsers.push({
            NAME: user["name"],
            ATTUID: user["ATTuid"]
        });
    };
    return parsedUsers;
}

// insert user to DB
exports.insertUserInDb = async (users) => {
    return await oneConnection.transaction({ autocommit: true }, async function (t) {
        return await Users.bulkCreate(users,
            { transaction: t }).catch(error => {
                loggerPino.error(error);
                throw new Error("Database error when creating users!");
            });
    });

}

exports.createBcUser = [[
    body("userName").trim(),
    check("userName").isLength({ min: 1, max: 150 }),
    body("bcUserId").trim(),
    check("bcUserId").isLength({ min: 0, max: 150 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    try {
        const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
            const user = await Users.findOne({
                where: { BC_USER_ID: req.body["bcUserId"] },
            },
                { transaction: t }
            );
            if (user) {
                throw new Error("There is existing user with that id !");
            }
            return Users.create({
                NAME: req.body["userName"],
                BC_USER_ID: req.body["bcUserId"],
            }, { transaction: t });
        })

        return res.status(200).send({ message: "Successful!", id: result["dataValues"]["ID"] });

    }
    catch(error){
        loggerPino.error(error);
        return res.status(400).send({ message: error.message });
    }
}];
