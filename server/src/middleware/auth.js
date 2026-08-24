const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from Authorization header.
 * Attaches { id, role, entity } to req.user.
 * entity is 'user' (student/admin) or 'agent'.
 */
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Authentication required.' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required.' });
  next();
}

function agentOnly(req, res, next) {
  if (!req.user || req.user.entity !== 'agent')
    return res.status(403).json({ message: 'Agent access required.' });
  next();
}

function approvedAgentOnly(req, res, next) {
  if (!req.user || req.user.entity !== 'agent' || req.user.status !== 'approved')
    return res.status(403).json({ message: 'Approved agent access required.' });
  next();
}

module.exports = { authRequired, adminOnly, agentOnly, approvedAgentOnly };
