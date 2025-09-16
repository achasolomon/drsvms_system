import { User } from '../models';
import { JWTService } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { recordFailedLogin, clearFailedAttempts, checkPasswordStrength } from '../middleware/security';
import { Request, Response, NextFunction } from 'express';


import { logger } from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    employeeId: string;
    email: string;
    fullName: string;
    role: string;
    state: string;
    zone: string;
    unit?: string;
    rank?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterUserData {
  employeeId: string;
  email: string;
  password: string;
  role: 'officer' | 'admin' | 'supervisor';
  fullName: string;
  phone: string;
  state: string;
  zone: string;
  unit?: string;
  rank?: string;
}

export class AuthService {
  // User login
  static async login(credentials: LoginCredentials, req?: Request): Promise<LoginResponse> {
    const { email, password } = credentials;

    try {
      // Find user by email
      const user = await User.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        if (req) recordFailedLogin(req);
        throw createError('Invalid email or password', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        if (req) recordFailedLogin(req);
        throw createError('Account is deactivated. Contact administrator.', 401);
      }

      // Verify password
      const isPasswordValid = await user.checkPassword(password);
      if (!isPasswordValid) {
        if (req) recordFailedLogin(req);
        throw createError('Invalid email or password', 401);
      }

      // Clear failed attempts on successful login
      if (req) clearFailedAttempts(req);

      // Generate tokens
      const tokens = JWTService.generateTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      });

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Log successful login
      logger.info(`User login successful: ${user.email} (${user.employeeId})`);

      return {
        user: {
          id: user.id,
          employeeId: user.employeeId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          state: user.state,
          zone: user.zone,
          unit: user.unit,
          rank: user.rank,
        },
        tokens,
      };
    } catch (error) {
      throw error;
    }
  }


  // Refresh access token
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = JWTService.verifyRefreshToken(refreshToken);

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

      // Generate new access token
      const accessToken = JWTService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      });

      return { accessToken };
    } catch (error) {
      throw createError('Invalid refresh token', 401);
    }
  }

  // Register new user (admin only)
  static async register(userData: RegisterUserData): Promise<{ user: any; message: string }> {
    const {
      employeeId,
      email,
      password,
      role,
      fullName,
      phone,
      state,
      zone,
      unit,
      rank,
    } = userData;

    // Check if employee ID already exists
    const existingEmployee = await User.findOne({
      where: { employeeId: employeeId.toUpperCase().trim() },
    });

    if (existingEmployee) {
      throw createError('Employee ID already exists', 409);
    }

    // Check if email already exists
    const existingEmail = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingEmail) {
      throw createError('Email already exists', 409);
    }

    // Validate password strength
    if (password.length < 6) {
      throw createError('Password must be at least 6 characters long', 400);
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      employeeId: employeeId.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      fullName: fullName.trim(),
      phone: phone.trim(),
      state: state.trim(),
      zone: zone.trim(),
      unit: unit?.trim(),
      rank: rank?.trim(),
    });

    logger.info(`New user registered: ${user.email} (${user.employeeId}) by admin`);

    return {
      user: {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        state: user.state,
        zone: user.zone,
        unit: user.unit,
        rank: user.rank,
      },
      message: 'User registered successfully',
    };
  }

  // Change password
  static async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<{ message: string; passwordStrength?: any }> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify old password
    const isOldPasswordValid = await user.checkPassword(oldPassword);
    if (!isOldPasswordValid) {
      throw createError('Current password is incorrect', 400);
    }

    // Check password strength
    const strengthCheck = checkPasswordStrength(newPassword);
    if (!strengthCheck.isStrong) {
      throw createError(`Password is not strong enough: ${strengthCheck.issues.join(', ')}`, 400);
    }

    if (oldPassword === newPassword) {
      throw createError('New password must be different from current password', 400);
    }

    // Hash and update new password
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    logger.info(`Password changed for user: ${user.email} (${user.employeeId})`);

    return {
      message: 'Password changed successfully',
      passwordStrength: {
        score: strengthCheck.score,
        maxScore: 10
      }
    };
  }

  // Get user profile
  static async getProfile(userId: number): Promise<any> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    return user;
  }

  // Update user profile
  static async updateProfile(
    userId: number,
    updateData: {
      fullName?: string;
      phone?: string;
      unit?: string;
    }
  ): Promise<any> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw createError('User not found', 404);
    }

    // Update allowed fields
    if (updateData.fullName) user.fullName = updateData.fullName.trim();
    if (updateData.phone) user.phone = updateData.phone.trim();
    if (updateData.unit) user.unit = updateData.unit.trim();

    await user.save();

    logger.info(`Profile updated for user: ${user.email} (${user.employeeId})`);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  // Deactivate user (admin only)
  static async deactivateUser(userId: number, adminId: number): Promise<{ message: string }> {
    const user = await User.findByPk(userId);
    const admin = await User.findByPk(adminId);

    if (!user) {
      throw createError('User not found', 404);
    }

    if (!admin || admin.role !== 'admin') {
      throw createError('Only admins can deactivate users', 403);
    }

    if (user.id === admin.id) {
      throw createError('Cannot deactivate your own account', 400);
    }

    user.isActive = false;
    await user.save();

    logger.info(`User deactivated: ${user.email} (${user.employeeId}) by ${admin.email}`);

    return { message: 'User deactivated successfully' };
  }

  // Reactivate user (admin only)
  static async reactivateUser(userId: number, adminId: number): Promise<{ message: string }> {
    const user = await User.findByPk(userId);
    const admin = await User.findByPk(adminId);

    if (!user) {
      throw createError('User not found', 404);
    }

    if (!admin || admin.role !== 'admin') {
      throw createError('Only admins can reactivate users', 403);
    }

    user.isActive = true;
    await user.save();

    logger.info(`User reactivated: ${user.email} (${user.employeeId}) by ${admin.email}`);

    return { message: 'User reactivated successfully' };
  }
}