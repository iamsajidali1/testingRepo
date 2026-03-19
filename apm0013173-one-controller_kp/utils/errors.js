const errorModel = require("../api/models/errorModel");


class BaseError {
    code = -1;
    userMessage = "";

    constructor(msg) {
        const err = new Error();
        this.stack = err.stack;
        this.name = this.constructor.name;
        this.message = msg;
    }

    patchStack() {
        return this.stack.split("\n").slice(1).join("\n");
    }

    toString() {
        const stack = this.patchStack();
        return `${this.name} (${this.code}): ${this.message}\n${stack}`;
    }

    async getUserMessage() {
        const model = errorModel.define();
        let msg = await model.findByPk(this.code);
        msg = ((msg || {}).dataValues || {}).MESSAGE;
        return msg;
    }

    async toResponse() {
        return {
            "message": this.message,
            "stacktrace": this.toString(),
            "userMessage": (await this.getUserMessage()) || this.userMessage
        };
    }
}

// This is a sample
class DuplicateEntry extends BaseError {
    code = 1;
    userMessage = (
        "The application has encountered a duplicate entry,"
            + " please contact support at some@email.tld"
    );
}

module.exports = { BaseError, DuplicateEntry };
