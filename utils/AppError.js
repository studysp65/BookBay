// An error that carries an HTTP status code, so the error handler
// knows what to send back (for example 404 for "not found").
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
