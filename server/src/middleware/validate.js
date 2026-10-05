/** Validates and replaces req.body with the parsed (trimmed, defaulted) value. */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) return next(result.error);
  req.body = result.data;
  next();
};
