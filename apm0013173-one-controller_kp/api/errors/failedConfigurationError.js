class ConfigurationFailedError extends Error {
    constructor(message, failedConfigData) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name
        this._failedConfigData = failedConfigData;
    }

    get failedConfigData() {
        return this._failedConfigData;
    }
}

module.exports = ConfigurationFailedError