import axios from 'axios';
import { logger } from './logger';

const API_BASE = 'http://localhost:5000/api/v1';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class VehicleTester {
  private static accessToken: string = '';

  // Login first to get access token
  static async loginForTests(): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@drsvms.gov.ng',
        password: 'admin123'
      });

      if (response.status === 200) {
        this.accessToken = response.data.data.tokens.accessToken;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Login failed for vehicle tests:', error);
      return false;
    }
  }

  // Test plate number validation
  static async testPlateValidation(): Promise<TestResult> {
    if (!this.accessToken) {
      return { success: false, message: 'Not authenticated', error: 'Login first' };
    }

    const testCases = [
      { plateNumber: 'ABC-123-DE', shouldBeValid: true },
      { plateNumber: 'ab123cd', shouldBeValid: true }, // Should normalize
      { plateNumber: 'INVALID', shouldBeValid: false },
      { plateNumber: 'LA-456-ST', shouldBeValid: true },
      { plateNumber: 'ABUJA-123', shouldBeValid: true }
    ];

    try {
      let passed = 0;
      let total = testCases.length;

      for (const testCase of testCases) {
        const response = await axios.post(
          `${API_BASE}/vehicles/validate-plate`,
          { plateNumber: testCase.plateNumber },
          { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        const isValid = response.data.data.isValid;
        if (isValid === testCase.shouldBeValid) {
          passed++;
          logger.info(`✅ Plate validation: ${testCase.plateNumber} -> ${isValid ? 'Valid' : 'Invalid'}`);
        } else {
          logger.error(`❌ Plate validation: ${testCase.plateNumber} -> Expected ${testCase.shouldBeValid}, got ${isValid}`);
        }
      }

      return {
        success: passed === total,
        message: `Plate validation test: ${passed}/${total} passed`,
        data: { passed, total }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Plate validation test failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Test vehicle lookup
  static async testVehicleLookup(): Promise<TestResult> {
    if (!this.accessToken) {
      return { success: false, message: 'Not authenticated', error: 'Login first' };
    }

    try {
      // Test lookup of existing vehicle
      const response = await axios.get(`${API_BASE}/vehicles/lookup/ABC-123-DE`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });

      const vehicle = response.data.data.vehicle;

      if (vehicle) {
        return {
          success: true,
          message: 'Vehicle lookup test passed - found existing vehicle',
          data: {
            plateNumber: vehicle.plateNumber,
            fullName: vehicle.fullName
          }
        };
      } else {
        // Test with non-existent plate
        const notFoundResponse = await axios.get(`${API_BASE}/vehicles/lookup/XXX-999-ZZ`, {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        return {
          success: notFoundResponse.data.data.vehicle === null,
          message: notFoundResponse.data.data.vehicle === null
            ? 'Vehicle lookup test passed - correctly returned null for non-existent vehicle'
            : 'Vehicle lookup test failed - should return null for non-existent vehicle'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Vehicle lookup test failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Test vehicle search
  static async testVehicleSearch(): Promise<TestResult> {
    if (!this.accessToken) {
      return { success: false, message: 'Not authenticated', error: 'Login first' };
    }

    try {
      const response = await axios.get(`${API_BASE}/vehicles/search`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: {
          page: 1,
          limit: 10,
          status: 'active'
        }
      });

      const result = response.data.data;

      return {
        success: true,
        message: `Vehicle search test passed - found ${result.totalCount} vehicles`,
        data: {
          totalCount: result.totalCount,
          currentPage: result.currentPage,
          totalPages: result.totalPages
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Vehicle search test failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Run all tests (now in the right place)
  static async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    logger.info('🚗 Starting Vehicle Tests...');

    // Ensure login first
    const loggedIn = await this.loginForTests();
    if (!loggedIn) {
      results.push({ success: false, message: 'Vehicle tests aborted - login failed', error: 'Authentication failed' });
      return results;
    }

    results.push(await this.testPlateValidation());
    results.push(await this.testVehicleLookup());
    results.push(await this.testVehicleSearch());

    logger.info('🏁 Vehicle Tests Complete');
    return results;
  }
}
