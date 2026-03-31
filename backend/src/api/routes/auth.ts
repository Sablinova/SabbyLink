import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const SALT_ROUNDS = 12;

// Helper to extract and verify JWT from Authorization header
async function getUserIdFromToken(authHeader: string | undefined): Promise<number | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = verify(token, env.JWT_SECRET) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

export const authRoutes = new Elysia({ prefix: '/api/v1/auth' })
  .post(
    '/register',
    async ({ body, set }) => {
      try {
        const { username, email, password } = body;

        // Check if user exists using select
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          set.status = 409;
          return { error: 'User already exists' };
        }

        // Hash password
        const passwordHash = await hash(password, SALT_ROUNDS);

        // Create user
        const [user] = await db
          .insert(users)
          .values({
            username,
            email,
            passwordHash,
          })
          .returning();

        // Generate JWT
        const token = sign(
          { userId: user.id, email: user.email },
          env.JWT_SECRET,
          { expiresIn: env.JWT_EXPIRES_IN }
        );

        logger.info(`User registered: ${user.email}`);

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
          },
        };
      } catch (error) {
        logger.error('Registration error:', error);
        set.status = 500;
        return { error: 'Registration failed' };
      }
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 32 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .post(
    '/login',
    async ({ body, set }) => {
      try {
        const { email, password } = body;

        // Find user using select instead of relational query
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          set.status = 401;
          return { error: 'Invalid credentials' };
        }

        // Verify password
        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          set.status = 401;
          return { error: 'Invalid credentials' };
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        // Generate JWT
        const token = sign(
          { userId: user.id, email: user.email },
          env.JWT_SECRET,
          { expiresIn: env.JWT_EXPIRES_IN }
        );

        logger.info(`User logged in: ${user.email}`);

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            lastLogin: new Date(),
          },
        };
      } catch (error) {
        logger.error('Login error:', error);
        set.status = 500;
        return { error: 'Login failed' };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    }
  )
  .get('/me', async ({ headers, set }) => {
    // Manual auth check for this endpoint
    const userId = await getUserIdFromToken(headers.authorization);
    
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };
    } catch (error) {
      logger.error('Get user error:', error);
      set.status = 500;
      return { error: 'Failed to get user' };
    }
  })
  .post('/logout', async ({ headers, set }) => {
    // Manual auth check for this endpoint
    const userId = await getUserIdFromToken(headers.authorization);
    
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    logger.info(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  });
