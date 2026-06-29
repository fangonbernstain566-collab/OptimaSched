import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_long_secure_random_string_for_dev';

export const authenticate = async (req, res, next) => {
  if (!prisma || !prisma.user) {
    console.error('CRITICAL: Prisma client is undefined in auth middleware!');
    return res.status(500).json({ success: false, error: 'Database engine not initialized.' });
  }

  try {
    const authHeader = req.headers.authorization; // ✅ FIX: was never read!

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User context not found inside system directory.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Session expired or signature verification failed.' });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role.name)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Your operational tier does not have clearance for this execution pathway.'
      });
    }
    next();
  };
};