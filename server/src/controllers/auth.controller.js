import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { logAudit } from '../utils/auditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_long_secure_random_string_for_dev';

export const registerUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, roleName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "An account with that email identifier already exists." });
    }

    const targetRole = await prisma.role.findUnique({ where: { name: roleName } });
    if (!targetRole) {
      return res.status(400).json({ success: false, error: `System role context '${roleName}' does not exist.` });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: targetRole.id
      },
      include: { role: true }
    });

    await logAudit(req, {
      action: 'USER_CREATE',
      module: 'AUTH',
      description: `User account created for ${newUser.email}.`,
      targetRecordId: newUser.id,
      targetRecordName: `${newUser.firstName} ${newUser.lastName}`,
      metadata: { role: newUser.role.name },
    });

    return res.status(201).json({
      success: true,
      message: "Identity context generated successfully.",
      user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, role: newUser.role.name }
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid cryptographic credentials mismatch." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid cryptographic credentials mismatch." });
    }

    // Generate stateless token containing non-sensitive payload parameters
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    req.user = user;
    await logAudit(req, {
      action: 'USER_LOGIN',
      module: 'AUTH',
      description: `User ${user.email} logged in successfully.`,
      targetRecordId: user.id,
      targetRecordName: `${user.firstName} ${user.lastName}`,
      metadata: { email: user.email },
    });

    return res.status(200).json({
      success: true,
      message: "Session established.",
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name }
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    await logAudit(req, {
      action: 'USER_LOGOUT',
      module: 'AUTH',
      description: `User ${req.user.email} logged out.`,
      targetRecordId: req.user.id,
      targetRecordName: `${req.user.firstName} ${req.user.lastName}`,
      metadata: { email: req.user.email },
    });

    return res.status(200).json({
      success: true,
      message: 'Session terminated successfully.',
    });
  } catch (error) {
    next(error);
  }
};