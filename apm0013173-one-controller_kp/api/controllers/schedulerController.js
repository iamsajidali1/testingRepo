/* eslint-disable max-classes-per-file, array-bracket-newline */

/* eslint-disable consistent-return, curly, no-console, no-magic-numbers */

const { check, validationResult } = require("express-validator");
const validator = require("express-validator");
const ax = require("axios");
const {
    created,
    forbidden,
    internalServerError,
    notFound,
    noContent,
    ok,
    unprocessableEntity
} = require("../statuses");
const { excelType } = require("../constants");
const { getLogger } = require("../../utils/logging");
const { "stringify": str } = JSON;

const LIMIT_ID = { "max": 120, "min": 24 };

class ResponseError extends Error {}
class NotFoundError extends Error {}
class TooManyItemsError extends Error {}

exports.getProcessByPid = async (ses, pid) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Fetching process by pid: ${str(pid)}`);
    const { CONFIG } = require("../config/configuration");
    const { ormUrl } = CONFIG;
    const resp = await ax.get(`${ormUrl}/api/processresult?mongo_id=${pid}`);
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`${ses}: [Scheduler] Error in ORM response: ${str(data)}`);
        throw new ResponseError(data);
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`${ses}: [Scheduler] Not found: ${str(data)}`);
        throw new NotFoundError(data);
    }

    if (data.results.length > 1) {
        log.info(`${ses}: [Scheduler] Too many items: ${str(data)}`);
        throw new TooManyItemsError(data);
    }

    const [process] = data.results;
    log.info(`${ses}: [Scheduler] Found process: ${str(process)}`);
    return process;
};

exports.getUserByAttuid = async (ses, attuid) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Fetching user by attuid: ${str(attuid)}`);
    const { CONFIG } = require("../config/configuration");
    const { ormUrl } = CONFIG;
    const resp = await ax.get(`${ormUrl}/api/users?attuid=${attuid}`);
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`${ses}: [Scheduler] Error in ORM response: ${str(data)}`);
        throw new ResponseError(data);
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`${ses}: [Scheduler] Not found: ${str(data)}`);
        throw new NotFoundError(data);
    }

    if (data.results.length > 1) {
        log.info(`${ses}: [Scheduler] Too many items: ${str(data)}`);
        throw new TooManyItemsError(data);
    }

    const [user] = data.results;
    log.info(`${ses}: [Scheduler] Found user: ${str(user)}`);
    return user;
};


exports.getUserByBcId = async (ses, bcId) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Fetching user by bcid: ${str(bcId)}`);
    const { CONFIG } = require("../config/configuration");
    const { ormUrl } = CONFIG;
    const resp = await ax.get(`${ormUrl}/api/users?bc_user_id=${bcId}`);
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`${ses}: [Scheduler] Error in ORM response: ${str(data)}`);
        throw new ResponseError(data);
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`${ses}: [Scheduler] Not found: ${str(data)}`);
        throw new NotFoundError(data);
    }

    if (data.results.length > 1) {
        log.info(`${ses}: [Scheduler] Too many items: ${str(data)}`);
        throw new TooManyItemsError(data);
    }

    const [user] = data.results;
    log.info(`${ses}: [Scheduler] Found user: ${str(user)}`);
    return user;
};


exports.patchProcessByPid = async (ses, pid, input) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Patching process by pid: ${str(pid)}`);
    const { CONFIG } = require("../config/configuration");
    const { ormUrl } = CONFIG;
    const process = await exports.getProcessByPid(ses, pid);

    const { id } = process;
    const bodyType = typeof input;

    log.info(`${ses}: [Scheduler] Patch body: ${bodyType}, ${str(input)}`);
    const resp = await ax.patch(
        `${ormUrl}/api/processresult/${id}/`,
        input,
        {
            "headers": { "content-type": "application/json" }
        }
    );

    const { data, status } = resp;

    if (status !== ok) {
        log.info(`${ses}: [Scheduler] Error in ORM response: ${str(data)}`);
        throw new ResponseError(data);
    }

    log.info(`${ses}: [Scheduler] Found process: ${str(process)}`);
    return process;
};

exports.createNewProcess = async (ses, input) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Creating a new process`);
    const { CONFIG } = require("../config/configuration");
    const { ormUrl } = CONFIG;
    const resp = await ax.post(
        `${ormUrl}/api/processresult/`,
        input,
        {
            "headers": { "content-type": "application/json" }
        }
    );

    const { data, status } = resp;

    if (status !== created) {
        log.info(`${ses}: [Scheduler] Error in ORM response: ${str(data)}`);
        throw new ResponseError(data);
    }

    log.info(`${ses}: [Scheduler] Created process: ${str(data)}`);
    return data;
};

/*
 * Verify owner of process
 * (can be spoofed so easily that the IF has no point...)
 * should return false on match, true on mis-match.
 */
exports.badProcessOwner = (ses, owner, value) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Comparing with attESHr: ${value}`);
    if (!owner) {
        log.info(`${ses}: [Scheduler] Owner is falsy value, skipping`);
        return false;
    }
    return owner.localeCompare(value);
};

/*
 * Check status of a process. Partial + full results, delete on OK status.
 */
exports.checkProcess = [[
    validator.query("id").trim(),
    check("id").isLength(LIMIT_ID)
], async (req, res) => {
    const log = getLogger();
    const { atteshr, "sessionID": ses, query } = req;

    log.info(`${ses}: [Scheduler] Checking process with query: ${str(query)}`);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const out = errors.array();
        log.info(`${ses}: [Scheduler] Validation errors: ${str(out)}`);
        return res.status(unprocessableEntity).json({ "errors": out });
    }

    let process = null;
    try {
        process = await exports.getProcessByPid(ses, query.id);
    } catch (err) {
        log.info(`${ses}: [Scheduler] Encountered error: ${str(err)}`);
        // No clue if FE has 500 check hardcoded anywhere, need to keep it
        if (err instanceof ResponseError) {
            return res.status(internalServerError).send(err.message);
        } else if (err instanceof NotFoundError) {
            return res.status(notFound).send("Pid not found!");
        } else if (err instanceof TooManyItemsError) {
            return res.status(internalServerError).send(err.message);
        }
        throw err;
    }

    const { "attuid": processAttuid } = process.user || {};

    if (exports.badProcessOwner(ses, processAttuid, (atteshr || {}).attuid)) {
        return res.status(forbidden).send("You have no permission for this!");
    }

    log.info(`${ses}: [Scheduler] Everything seems okay, deleting item`);
    const { "mongo_id": procId, "status": procStatus } = process;

    if (procStatus === "OK") await exports.deleteProcessInfo(ses, procId);
    log.info(`${ses}: [Scheduler] Should be deleted`);

    const result = {
        "_id": procId,
        "code": process.code,
        "result": process.result,
        "status": procStatus
    };

    log.info(`${ses}: [Scheduler] Result: ${str(result)}`);
    return res.status(ok).json(result);
}];

/*
 * Basically checkProcess, but sets Content-Disposition for XLSX.
 * (and is probably POST or something)
 */
exports.checkProcessReturnBlob = [[
    validator.body("id").trim(),
    check("id").isLength(LIMIT_ID)
], async (req, res) => {
    const log = getLogger();
    const { atteshr, body, "sessionID": ses } = req;
    log.info(`${ses}: [Scheduler] Checking process for blob: ${str(body)}`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const out = errors.array();
        log.info(`${ses}: [Scheduler] Validation errors: ${str(out)}`);
        return res.status(unprocessableEntity).json({ "errors": out });
    }

    const { id } = body;
    let process = null;

    try {
        process = await exports.getProcessByPid(ses, id);
    } catch (err) {
        log.info(`${ses}: [Scheduler] Encountered error: ${str(err)}`);
        // No clue if FE has 500 check hardcoded anywhere, need to keep it
        if (err instanceof ResponseError) {
            return res.status(internalServerError).send(err.message);
        } else if (err instanceof NotFoundError) {
            return res.status(notFound).send("Pid not found!");
        } else if (err instanceof TooManyItemsError) {
            return res.status(internalServerError).send(err.message);
        }
        throw err;
    }

    // User may be null (from UPM), so replace with object to get undefined
    const { "attuid": processAttuid } = process.user || {};

    /*
     * TODO: security hole because UPM user is not in DB,
     * therefore no FK possible, therefore USER_ID is NULL
     * therefore the badProcessOwner check allows anyone to retrieve
     * any process that has NULL as USER_ID.
     */
    if (exports.badProcessOwner(ses, processAttuid, (atteshr || {}).attuid)) {
        return res.status(forbidden).send("You have no permission for this!");
    }

    const {
        "special_result": specialResult,
        "special_return_type": specialReturnType,
        status
    } = process;

    log.info(`${ses}: [Scheduler] Checking status`);
    if (status === "Error") {
        return res.status(internalServerError).send("Internal error");
    }

    if (status === "enrolled") return res.status(noContent).send();

    if (status !== "OK") {
        return res.status(internalServerError).send("Internal error");
    }

    await exports.deleteProcessInfo(ses, process.mongo_id);
    if (specialReturnType === "excel") {
        res.setHeader("Content-Type", excelType);
        // TODO: Accept header shouldn"t be set unless the INPUT! is!! BINARY!!
        res.setHeader("Accept", excelType);
        res.setHeader("Content-Disposition", "inline; filename=mds.xls");
    }
    return res.send(specialResult);
}];

/*
 * Needs rewrite to proper async, but it's unstable to just add await
 * everywhere (grep -r ...).
 */
exports.updateStatusAndResult = (
    pid, status, code, input, specialResult
) => {
    const log = getLogger();
    log.info("[Scheduler] Update status and result");
    let result = input;
    if (typeof input !== "string") {
        result = str(input);
    }

    exports.patchProcessByPid("<missing>", pid, {
        code,
        result,
        "special_result": specialResult,
        status
    }).then(console.log).catch((err) => {
        log.error(str(err));
        throw err;
    });
};

exports.deleteProcessInfo = async (ses, pid) => {
    const log = getLogger();
    log.info(`${ses}: [Scheduler] Deleting process: ${str(pid)}`);

    const { CONFIG } = require("../config/configuration");
    const { ormUrl } = CONFIG;
    const process = await exports.getProcessByPid(ses, pid);
    const resp = await ax.delete(
        `${ormUrl}/api/processresult/${process.id}/`
    );

    const { data, status } = resp;
    log.info(`${ses}: [Scheduler] Response status: ${status}`);
    if (status === noContent) return;

    log.info(`${ses}: [Scheduler] Encountered error: ${str(data)}`);
    return data;
};

exports.updateProcess = [[
    validator.body("id").trim(),
    check("id").isLength(LIMIT_ID)
], async (req, res) => {
    const { id, status, code, result, specialResult } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const out = errors.array();
        return res.status(unprocessableEntity).json({ "errors": out });
    }
    try {
        // Update the Process
        await exports.updateStatusAndResult(id, status, code, result, specialResult);
        // Delete the Process if status is not enrolled
        return res.status(ok).json({
            "status": "OK",
            "statusCode": ok,
            "message": `Process with pid: ${id} updated successfully!`
        });
    } catch (error) {
        console.log(error);
        return res.status(internalServerError).json({
            "status": "ProcessUpdateFailed",
            "statusCode": internalServerError,
            "message": `Failed to update the process with id: ${id}!`
        });
    }
}];


exports.NotFoundError = NotFoundError;
