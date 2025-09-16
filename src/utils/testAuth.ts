import axios from 'axios';
import { logger } from './logger';

const API_BASE = 'http://localhost:5000/api/v1';

interface TestResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

export class AuthTester {
    private static accessToken: string = '';
    private static refreshToken: string = '';

    // Test login endpoint
    static async testLogin(): Promise<TestResult> {
        try {
            const response = await axios.post(`${API_BASE}/auth/login`, {
                email: 'admin@drsvms.gov.ng',
                password: 'admin123'
            });

            if (response.status === 200) {
                this.accessToken = response.data.data.tokens.accessToken;
                this.refreshToken = response.data.data.tokens.refreshToken;

                return {
                    success: true,
                    message: 'Login test passed',
                    data: {
                        user: response.data.data.user,
                        hasTokens: !!this.accessToken && !!this.refreshToken
                    }
                };
            }

            return {
                success: false,
                message: 'Login test failed - unexpected status code',
                error: `Status: ${response.status}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Login test failed',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Test invalid login
    static async testInvalidLogin(): Promise<TestResult> {
        try {
            const response = await axios.post(`${API_BASE}/auth/login`, {
                email: 'wrong@email.com',
                password: 'wrongpassword'
            });

            return {
                success: false,
                message: 'Invalid login test failed - should have been rejected',
                error: 'Authentication accepted invalid credentials'
            };
        } catch (error: any) {
            if (error.response?.status === 401) {
                return {
                    success: true,
                    message: 'Invalid login test passed - correctly rejected',
                };
            }

            return {
                success: false,
                message: 'Invalid login test failed - wrong error type',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Test protected route access
    static async testProtectedRoute(): Promise<TestResult> {
        if (!this.accessToken) {
            return {
                success: false,
                message: 'Cannot test protected route - no access token',
                error: 'Run login test first'
            };
        }

        try {
            const response = await axios.get(`${API_BASE}/auth/profile`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });

            if (response.status === 200) {
                return {
                    success: true,
                    message: 'Protected route test passed',
                    data: response.data.data.user
                };
            }

            return {
                success: false,
                message: 'Protected route test failed - unexpected status',
                error: `Status: ${response.status}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Protected route test failed',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Test token refresh
    static async testTokenRefresh(): Promise<TestResult> {
        if (!this.refreshToken) {
            return {
                success: false,
                message: 'Cannot test token refresh - no refresh token',
                error: 'Run login test first'
            };
        }

        try {
            const response = await axios.post(`${API_BASE}/auth/refresh`, {
                refreshToken: this.refreshToken
            });

            if (response.status === 200 && response.data.data.accessToken) {
                this.accessToken = response.data.data.accessToken;

                return {
                    success: true,
                    message: 'Token refresh test passed',
                    data: { hasNewToken: !!response.data.data.accessToken }
                };
            }

            return {
                success: false,
                message: 'Token refresh test failed - no new token received',
                error: 'Missing access token in response'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Token refresh test failed',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Test unauthorized access
    static async testUnauthorizedAccess(): Promise<TestResult> {
        try {
            const response = await axios.get(`${API_BASE}/auth/profile`);

            return {
                success: false,
                message: 'Unauthorized access test failed - should have been rejected',
                error: 'Accessed protected route without token'
            };
        } catch (error: any) {
            if (error.response?.status === 401) {
                return {
                    success: true,
                    message: 'Unauthorized access test passed - correctly rejected'
                };
            }

            return {
                success: false,
                message: 'Unauthorized access test failed - wrong error type',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Test user registration (admin only)
    static async testUserRegistration(): Promise<TestResult> {
        if (!this.accessToken) {
            return {
                success: false,
                message: 'Cannot test user registration - no access token',
                error: 'Run login test first'
            };
        }

        const testUser = {
            employeeId: `TEST${Date.now()}`,
            email: `test${Date.now()}@drsvms.gov.ng`,
            password: 'Test123!',
            role: 'officer',
            fullName: 'Test Officer',
            phone: '+234803123456789'.slice(0, 14), // Ensure proper format
            state: 'Lagos',
            zone: 'Test Zone',
            unit: 'Test Unit',
            rank: 'Inspector'
        };

        try {
            const response = await axios.post(`${API_BASE}/auth/register`, testUser, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });

            if (response.status === 201) {
                return {
                    success: true,
                    message: 'User registration test passed',
                    data: response.data.data.user
                };
            }

            return {
                success: false,
                message: 'User registration test failed - unexpected status',
                error: `Status: ${response.status}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'User registration test failed',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Test validation errors
    static async testValidation(): Promise<TestResult> {
        try {
            const response = await axios.post(`${API_BASE}/auth/login`, {
                email: 'invalid-email',
                password: '123' // Too short
            });

            return {
                success: false,
                message: 'Validation test failed - should have been rejected',
                error: 'Invalid data was accepted'
            };
        } catch (error: any) {
            if (error.response?.status === 400) {
                return {
                    success: true,
                    message: 'Validation test passed - correctly rejected invalid data',
                    data: error.response.data.errors
                };
            }

            return {
                success: false,
                message: 'Validation test failed - wrong error type',
                error: JSON.stringify(error.response?.data || error.message || error, null, 2)
            };
        }
    }

    // Run all authentication tests
    static async runAllTests(): Promise<void> {
        logger.info('🧪 Starting Authentication Tests...\n');

        const tests = [
            { name: 'Login Test', test: this.testLogin },
            { name: 'Invalid Login Test', test: this.testInvalidLogin },
            { name: 'Protected Route Test', test: this.testProtectedRoute },
            { name: 'Token Refresh Test', test: this.testTokenRefresh },
            { name: 'Unauthorized Access Test', test: this.testUnauthorizedAccess },
            { name: 'User Registration Test', test: this.testUserRegistration },
            { name: 'Validation Test', test: this.testValidation },
        ];

        let passed = 0;
        let failed = 0;

        for (const { name, test } of tests) {
            try {
                const result = await test.bind(this)();

                if (result.success) {
                    logger.info(`✅ ${name}: ${result.message}`);
                    if (result.data) {
                        console.log('   Data:', JSON.stringify(result.data, null, 2));
                    }
                    passed++;
                } else {
                    logger.error(`❌ ${name}: ${result.message}`);
                    if (result.error) {
                        console.log('   Error:', result.error);
                    }
                    failed++;
                }
            } catch (error) {
                logger.error(`💥 ${name}: Test crashed - ${error}`);
                failed++;
            }

            console.log(''); // Add spacing between tests
        }

        logger.info(`\n🏁 Authentication Tests Complete:`);
        logger.info(`✅ Passed: ${passed}`);
        logger.info(`❌ Failed: ${failed}`);
        logger.info(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    }
}