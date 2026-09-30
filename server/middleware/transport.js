export function requireSecureTransport(config) {
  return (req, res, next) => {
    if (config.deployment && !req.secure) return res.status(426).json({ error: 'HTTPS is required. Use the secure store address.' });
    next();
  };
}
