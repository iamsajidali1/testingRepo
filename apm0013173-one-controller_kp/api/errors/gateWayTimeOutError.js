class GateWayTimeOut extends Error {
    constructor (message) {
      super(message)
      Error.captureStackTrace(this, this.constructor);

      this.name = this.constructor.name
      this.status = 504
    }

    statusCode() {
      return this.status
    }
  }

  module.exports = GateWayTimeOut