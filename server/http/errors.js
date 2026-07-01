class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const normalizeError = reason => reason instanceof Error
  ? reason
  : new Error(reason == null ? 'Unknown handler error' : String(reason));

const asyncHandler = handler => (req, res, next) => Promise.resolve()
  .then(() => handler(req, res, next))
  .catch(reason => next(normalizeError(reason)));

function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  const hasClientStatus = [error && error.status, error && error.statusCode]
    .some(status => Number.isInteger(status) && status >= 400 && status < 500);
  if (hasClientStatus) return next(error);
  console.error(error);
  return res.status(500).json({ error: 'Server Error' });
}

module.exports = { HttpError, asyncHandler, errorMiddleware };
