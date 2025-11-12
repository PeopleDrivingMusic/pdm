import { fail, redirect } from '@sveltejs/kit';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/session';
import { UserService } from '$lib/db/queries';
import { verifyPassword, hashPassword } from '$lib/utils/password';
import { logger } from '$lib/utils/logger';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// If user is already logged in
	if (event.locals.user) {
		logger.info("Already authenticated user redirected from login", {
			component: "auth",
			userId: event.locals.user.id,
			requestId: event.locals.requestId
		});
		throw redirect(302, '/');
	}
	
	return {};
};

export const actions: Actions = {
    login: async (event) => {
        const formData = await event.request.formData();
        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();

        // Input validation
        if (!email || !password) {
            logger.warn("Login attempt with missing credentials", {
                component: "auth",
                requestId: event.locals.requestId,
                metadata: {
                    hasEmail: !!email,
                    hasPassword: !!password
                }
            });
			
            return fail(400, {
                error: 'Email and password are required'
            });
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return fail(400, {
                error: 'Invalid data format'
            });
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            logger.warn("Login attempt with invalid email format", {
                component: "auth",
                requestId: event.locals.requestId,
                metadata: { email }
            });
			
            return fail(400, {
                error: 'Invalid email format'
            });
        }

        try {
            // Find user by email
            const user = await UserService.getUserByEmail(email.toLowerCase());
			
            if (!user || !user.hashedPassword) {
                logger.security("Login attempt with non-existent or OAuth-only user", "warn", {
                    requestId: event.locals.requestId,
                    metadata: { email }
                });
				
                return fail(400, {
                    error: 'Invalid email or password'
                });
            }

            // Verify password
            const validPassword = await verifyPassword(password, user.hashedPassword);
            if (!validPassword) {
                logger.security("Failed login attempt", "warn", {
                    requestId: event.locals.requestId,
                    metadata: { email, userId: user.id }
                });
				
                return fail(400, {
                    error: 'Invalid email or password'
                });
            }

            // Create session
            const sessionToken = generateSessionToken();
            const session = await createSession(sessionToken, user.id);
            setSessionTokenCookie(event, sessionToken, session.expiresAt);

            logger.info("User logged in successfully", {
                component: "auth",
                userId: user.id,
                requestId: event.locals.requestId,
                metadata: {
                    email: user.email,
                    loginMethod: 'password'
                }
            });

            throw redirect(302, '/');
        } catch (error) {
            if (error instanceof Response && error.status === 302) {
                // Re-throw redirect responses
                throw error;
            }
			
            logger.error("Login error", {
                component: "auth",
                requestId: event.locals.requestId,
                metadata: { error, email }
            });

            return fail(500, {
                error: 'Internal server error'
            });
        }
    },
    register: async (event) => {
        const formData = await event.request.formData();
        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();
        const confirmPassword = formData.get('confirmPassword')?.toString();
        const displayName = formData.get('displayName')?.toString();

        // Input validation
        if (!email || !password || !confirmPassword) {
            logger.warn("Register attempt with missing credentials", {
                component: "auth",
                requestId: event.locals.requestId,
                metadata: {
                    hasEmail: !!email,
                    hasPassword: !!password,
                    hasConfirmPassword: !!confirmPassword
                }
            });
            
            return fail(400, {
                error: 'Email, password and confirm password are required'
            });
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            logger.warn("Register attempt with invalid email format", {
                component: "auth",
                requestId: event.locals.requestId,
                metadata: { email }
            });
            
            return fail(400, {
                error: 'Invalid email format'
            });
        }

        // Password validation
        if (password.length < 8) {
            return fail(400, {
                error: 'Password must be at least 8 characters long'
            });
        }

        if (password !== confirmPassword) {
            return fail(400, {
                error: 'Passwords do not match'
            });
        }

        try {
            // Check if user with this email exists
            const existingUser = await UserService.getUserByEmail(email.toLowerCase());
            
            if (existingUser) {
                logger.warn("Register attempt with existing email", {
                    component: "auth",
                    requestId: event.locals.requestId,
                    metadata: { email }
                });
                
                return fail(400, {
                    error: 'A user with this email already exists'
                });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Create user
            const user = await UserService.createUser({
                email: email.toLowerCase(),
                displayName: displayName || email.split('@')[0],
                hashedPassword
            });

            logger.info("New user registered successfully", {
                component: "auth",
                userId: user.id,
                requestId: event.locals.requestId,
                metadata: {
                    email: user.email,
                    displayName: user.displayName,
                    loginMethod: 'password'
                }
            });

            // Create session
            const sessionToken = generateSessionToken();
            const session = await createSession(sessionToken, user.id);
            setSessionTokenCookie(event, sessionToken, session.expiresAt);

            logger.info("User automatically logged in after registration", {
                component: "auth",
                userId: user.id,
                sessionId: session.id,
                requestId: event.locals.requestId
            });

            throw redirect(302, '/');
        } catch (error) {
            if (error instanceof Response && error.status === 302) {
                throw error;
            }
            
            logger.error("Registration error", {
                component: "auth",
                requestId: event.locals.requestId,
                metadata: { error, email }
            });

            return fail(500, {
                error: 'Internal server error'
            });
        }
    }
}