class MuffinError extends Error {

    constructor(message, name = null) {
        super();
        Error.captureStackTrace(this, this.constructor);
        this.name = name || 'MuffinError';
        this.message = message;
    }

}

module.exports = MuffinError;
