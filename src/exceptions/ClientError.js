class ClientError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ClientError';
    this.statusCode = statusCode;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ClientError;
