/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { env } from '@/config/env';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/db/schema';

// JWT payload interface
export interface JWTPayload {
  userId: number;
  iat: number;
  exp: number;
}

// Extend Elysia context with authenticated user
export interface AuthContext {
  user: User;
  userId: number;
}

/**
 * JWT plugin for Elysia
 */
export const jwtPlugin = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: env.JWT_EXPIRES_IN,
    })
  );

/**
 * Authentication middleware
 * Verifies JWT token and loads user from database
 */
export const authenticate = (app: Elysia) =>
  app
    .use(jwtPlugin)
    .derive(async ({ headers, jwt, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        throw new Error('Unauthorized: Missing or invalid authorization header');
      }

      const token = authHeader.substring(7);

      try {
        const payload = await jwt.verify(token) as JWTPayload | false;

        if (!payload) {
          set.status = 401;
          throw new Error('Unauthorized: Invalid token');
        }

        // Load user from database using select (not relational query)
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (!user) {
          set.status = 401;
          throw new Error('Unauthorized: User not found');
        }

        return {
          user,
          userId: user.id,
        } as AuthContext;
      } catch (error) {
        set.status = 401;
        throw new Error(`Unauthorized: ${error}`);
      }
    });

/**
 * Optional authentication middleware
 * Loads user if token is present, but doesn't fail if not
 */
export const optionalAuth = (app: Elysia) =>
  app
    .use(jwtPlugin)
    .derive(async ({ headers, jwt }) => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          user: null,
          userId: null,
        };
      }

      const token = authHeader.substring(7);

      try {
        const payload = await jwt.verify(token) as JWTPayload | false;

        if (!payload) {
          return {
            user: null,
            userId: null,
          };
        }

        // Load user from database using select (not relational query)
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        return {
          user: user || null,
          userId: user?.id || null,
        };
      } catch {
        return {
          user: null,
          userId: null,
        };
      }
    });
