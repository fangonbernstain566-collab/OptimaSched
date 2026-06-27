import jwt from 'jsonwebtoken';
// 💡 CRITICAL: Import the shared instance that already has the PostgreSQL adapter configured
import { prisma } from '../config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_long_secure_random_string_for_dev';

/**
 * Validates the incoming JWT bearer token and injects the user context into the request.
 */
export const authenticate = async (req, res, next) => {
  // DEBUG: Check if prisma is actually loaded
  if (!prisma || !prisma.user) {
    console.error("CRITICAL: Prisma client is undefined in auth middleware!");
    return res.status(500).json({ success: false, error: "Database engine not initialized." });
  }

  try {

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "User context not found inside system directory." });
    }

    // Attach user profile to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Session expired or signature verification failed." });
  }
};

/**
 * Restricts access to specific roles.
 * @param {...string} allowedRoles - RoleNames allowed to pass (e.g. 'ADMINISTRATOR', 'REGISTRAR_SCHEDULER')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role.name)) {
      return res.status(403).json({ 
        success: false, 
        error: "Forbidden. Your operational tier does not have clearance for this execution pathway." 
      });
    }
    next();
  };
};