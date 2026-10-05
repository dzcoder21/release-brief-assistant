// Strips MongoDB operator keys ($where, $gt ...) and dotted keys from user input to prevent NoSQL injection.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
}

export const sanitize = (req, _res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
