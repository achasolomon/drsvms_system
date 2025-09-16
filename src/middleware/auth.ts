import { Request, Response, NextFunction } from 'express';
import { JWTService, TokenPayload } from '../utils/jwt';
import { createError } from './errorHandler';
import { User } from '../models';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      fullUser?: User;
    }
  }
}

// Authentication middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);
    const decoded = JWTService.verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await User.findOne({
      where: { 
        id: decoded.userId, 
        isActive: true 
      },
    });

    if (!user) {
      throw createError('User not found or inactive', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    req.user = decoded;
    req.fullUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

// Officer-only authorization
export const officerOnly = authorize('officer', 'supervisor', 'admin');

// Supervisor and admin only
export const supervisorOnly = authorize('supervisor', 'admin');

// Admin only authorization
export const adminOnly = authorize('admin');

// Optional authentication (for public endpoints that benefit from user context)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = JWTService.extractTokenFromHeader(authHeader);
    const decoded = JWTService.verifyAccessToken(token);
    
    const user = await User.findOne({
      where: { 
        id: decoded.userId, 
        isActive: true 
      },
    });

    if (user) {
      req.user = decoded;
      req.fullUser = user;
    }
  }catch (error) {
    if (error instanceof Error) {
      // Now you can safely access error.message
      console.error(error.message);
    } else {
      console.error('An unknown error occurred');
    }
    return next();
  }
};