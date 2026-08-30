/** Validates and replaces req.body with the parsed result. Zod errors are
 *  turned into field-level details by the error handler. */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(result.error);
  req.body = result.data;
  next();
};

/** Same, for query strings. */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) return next(result.error);
  req.validatedQuery = result.data;
  next();
};
