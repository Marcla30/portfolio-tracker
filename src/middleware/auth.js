const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // 1. Session web (unchanged)
  if (req.session && req.session.userId) return next();

  // 2. Bearer token (mobile)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      req.session = req.session || {};
      req.session.userId = decoded.userId;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { requireAuth };
