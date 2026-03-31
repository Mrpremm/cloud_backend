/**
 * Generic Zod validation middleware factory.
 *
 * Usage:
 *   validate(schema)           → validates req.body
 *   validate(schema, "query")  → validates req.query
 *   validate(schema, "params") → validates req.params
 */
const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // replace with coerced/transformed values
      next();
    } catch (err) {
      next(err); // Zod errors are caught by errorHandler middleware
    }
  };

module.exports = { validate };
