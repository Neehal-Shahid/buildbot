// Express 4 (this project's version) does not forward a rejected promise
// from an async route handler to the error-handling middleware in
// index.js — that's an Express 5 behavior. Without this, a route handler
// that throws or rejects without its own try/catch doesn't hang because
// nothing crashes; it hangs because nothing ever calls res.json() or
// res.status() either, so the client just sits there until its own
// timeout, and the only trace on the server side is a swallowed
// "Unhandled Promise Rejection" log. Wrapping a handler in this ensures
// any rejection reaches next(err) → the global error handler → an actual
// response, the same as if it had a manual try/catch.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
