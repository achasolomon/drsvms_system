import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

// Track failed login attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Rate limiting for login attempts
export const loginRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = new Date();
  
  const attempts = failedAttempts.get(ip);
  
  if (attempts) {
    const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
    
    // Reset counter if lockout period has passed
    if (timeSinceLastAttempt > LOCKOUT_DURATION) {
      failedAttempts.delete(ip);
    } else if (attempts.count >= MAX_FAILED_ATTEMPTS) {
      const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60);
      logger.warn(`Login attempt blocked for IP ${ip} - too many failed attempts`);
      
      return next(createError(
        `Too many failed login attempts. Try again in ${remainingTime} minutes.`,
        429
      ));
    }
  }
  
  next();
};

// Track failed login attempt
export const recordFailedLogin = (req: Request) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = new Date();
  
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: now };
  attempts.count++;
  attempts.lastAttempt = now;
  
  failedAttempts.set(ip, attempts);
  
  logger.warn(`Failed login attempt from IP ${ip} - attempt ${attempts.count}`);
};

// Clear failed attempts on successful login
export const clearFailedAttempts = (req: Request) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  failedAttempts.delete(ip);
};

// Sanitize user input
// Sanitize user input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove null bytes and control characters
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/[\x00-\x1F\x7F]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    Object.assign(req.body, sanitize(req.body));
  }

  if (req.query) {
    Object.assign(req.query, sanitize(req.query));
  }

  if (req.params) {
    Object.assign(req.params, sanitize(req.params));
  }

  next();
};


// Password strength checker
export const checkPasswordStrength = (password: string): {
  isStrong: boolean;
  issues: string[];
  score: number;
} => {
  const issues: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 2;
  else issues.push('Password should be at least 8 characters long');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else issues.push('Password should contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else issues.push('Password should contain uppercase letters');

  if (/\d/.test(password)) score += 1;
  else issues.push('Password should contain numbers');

  if (/[^a-zA-Z\d]/.test(password)) score += 2;
  else issues.push('Password should contain special characters');

  if (!/(.)\1{2,}/.test(password)) score += 1;
  else issues.push('Password should not contain repeated characters');

  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (!commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score += 1;
  } else {
    issues.push('Password should not contain common words');
  }

  return {
    isStrong: score >= 6 && issues.length === 0,
    issues,
    score: Math.min(score, 10)
  };
};

// Audit trail middleware
export const auditTrail = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store audit information in res.locals to be logged after response
    res.locals.auditAction = action;
    res.locals.auditData = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      userId: req.user?.userId,
      employeeId: req.user?.employeeId,
    };

    next();
  };
};