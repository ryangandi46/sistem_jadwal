/**
 * Auth Middleware
 * Mengecek header x-api-key.
 * Jika tidak ada atau tidak cocok dengan SECRET123, return 401.
 */
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== 'SECRET123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

module.exports = authMiddleware;
