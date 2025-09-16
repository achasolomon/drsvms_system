import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';

export class AuthController {
  // POST /api/v1/auth/login
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      const result = await AuthService.login({ email, password });
      
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/refresh
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      
      const result = await AuthService.refreshToken(refreshToken);
      
      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/register (Admin only)
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = req.body;
      
      const result = await AuthService.register(userData);
      
      res.status(201).json({
        status: 'success',
        message: result.message,
        data: { user: result.user },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/change-password
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user!.userId;
      
      const result = await AuthService.changePassword(userId, oldPassword, newPassword);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/auth/profile
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      
      const user = await AuthService.getProfile(userId);
      
      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/auth/profile
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updateData = req.body;
      
      const user = await AuthService.updateProfile(userId, updateData);
      
      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/logout
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // In a production app, you might want to blacklist the token
      // For now, we'll just log the logout
      const user = req.user!;
      logger.info(`User logout: ${user.email} (${user.employeeId})`);
      
      res.status(200).json({
        status: 'success',
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/users/:id/deactivate (Admin only)
  static async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.user!.userId;
      
      const result = await AuthService.deactivateUser(userId, adminId);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/auth/users/:id/reactivate (Admin only)
  static async reactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.user!.userId;
      
      const result = await AuthService.reactivateUser(userId, adminId);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/auth/verify (Check if token is valid)
  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      // If we reach here, the token is valid (middleware verified it)
      const user = req.user!;
      
      res.status(200).json({
        status: 'success',
        message: 'Token is valid',
        data: { 
          user: {
            userId: user.userId,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
          }
        },
      });
    } catch (error) {
      next(error);
    }
  }
}