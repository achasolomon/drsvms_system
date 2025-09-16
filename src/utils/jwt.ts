import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { jwtConfig } from '../config/jwt';
import { createError } from '../middleware/errorHandler';

// Token payload interface
export interface TokenPayload {
  userId: number;
  email: string;
  role: 'officer' | 'admin' | 'supervisor';
  employeeId: string;
}

// Refresh token payload interface
export interface RefreshTokenPayload {
  userId: number;
  email: string;
  tokenVersion: number;
}

export class JWTService {
  // Generate access token
 static generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.secret as Secret, {
    expiresIn: jwtConfig.expiresIn || "15m",
    issuer: "drsvms-api",
    audience: "drsvms-app",
  } as SignOptions);
}

  // Generate refresh token
 static generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, jwtConfig.refreshSecret as Secret, {
    expiresIn: jwtConfig.refreshExpiresIn || "7d",
    issuer: "drsvms-api",
    audience: "drsvms-app",
  } as SignOptions);
}

  // Verify access token
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: 'drsvms-api',
        audience: 'drsvms-app',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError('Access token expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid access token', 401);
      }
      throw createError('Token verification failed', 401);
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
        issuer: 'drsvms-api',
        audience: 'drsvms-app',
      }) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError('Refresh token expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 401);
      }
      throw createError('Refresh token verification failed', 401);
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw createError('Authorization header missing', 401);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw createError('Invalid authorization header format', 401);
    }

    return parts[1];
  }

  // Generate token pair
  static generateTokenPair(user: { 
    id: number; 
    email: string; 
    role: 'officer' | 'admin' | 'supervisor'; 
    employeeId: string; 
  }) {
    const accessTokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user.id,
      email: user.email,
      tokenVersion: 1, // Will be used for token invalidation
    };

    return {
      accessToken: this.generateAccessToken(accessTokenPayload),
      refreshToken: this.generateRefreshToken(refreshTokenPayload),
    };
  }
}