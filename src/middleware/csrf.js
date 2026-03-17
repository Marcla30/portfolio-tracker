const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 *
 * Token-based CSRF protection for session-based authentication.
 * - Generates and validates CSRF tokens stored in session
 * - Skips validation for Bearer token (OAuth/JWT) requests
 * - Skips validation for safe methods (GET, HEAD, OPTIONS)
 */

// Generate CSRF token for a session
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware: Generate or retrieve CSRF token from session
function csrfTokenMiddleware(req, res, next) {
  // Only for authenticated sessions (not for Bearer token)
  if (req.session && !req.headers.authorization) {
    // Generate token if not exists
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
    // Make token available to response locals for templates
    res.locals.csrfToken = req.session.csrfToken;
  }
  next();
}

// Middleware: Validate CSRF token for state-changing requests
function csrfProtectMiddleware(req, res, next) {
  // Skip CSRF validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF validation for Bearer token authentication (mobile API)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // Require CSRF token for session-based requests (web)
  if (req.session && req.session.csrfToken) {
    const token = req.body._csrf || req.headers['x-csrf-token'];

    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'CSRF token invalid or missing' });
    }
  }

  next();
}

module.exports = { csrfTokenMiddleware, csrfProtectMiddleware, generateCsrfToken };
