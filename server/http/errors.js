class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = handler => (req, res, next) =>
  Promise.resolve().then(() => handler(req, res, next)).catch(next);

function errorMiddleware(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Server Error' });
}

module.exports = { HttpError, asyncHandler, errorMiddleware };
