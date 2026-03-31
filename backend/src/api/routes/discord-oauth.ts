/**
 * Discord OAuth Routes
 * 
 * Handles Discord OAuth2 authentication flow for dashboard login
 * and User App token management for slash commands (hybrid mode).
 */

import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { users, discordAccounts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/crypto';

// Discord OAuth2 endpoints
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';

// OAuth2 scopes needed
const OAUTH_SCOPES = ['identify', 'email', 'guilds'].join(' ');

/**
 * Exchange authorization code for tokens
 */
async function exchangeCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID!,
      client_secret: env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Discord OAuth token exchange failed:', error);
    throw new Error('Failed to exchange authorization code');
  }

  return response.json();
}

/**
 * Refresh Discord access token
 */
async function refreshToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID!,
      client_secret: env.DISCORD_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

/**
 * Get Discord user info from access token
 */
async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
  verified: boolean;
}> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Discord user');
  }

  return response.json();
}

/**
 * Get user's guilds from access token
 */
async function getDiscordGuilds(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}>> {
  const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Discord guilds');
  }

  return response.json();
}

export const discordOAuthRoutes = new Elysia({ prefix: '/api/v1/auth/discord' })
  /**
   * Get OAuth2 authorization URL
   */
  .get('/url', ({ query }) => {
    if (!env.DISCORD_CLIENT_ID) {
      return { error: 'Discord OAuth not configured' };
    }

    const state = crypto.randomUUID();
    const redirectUri = query.redirect_uri || env.DISCORD_REDIRECT_URI;

    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: redirectUri!,
      response_type: 'code',
      scope: OAUTH_SCOPES,
      state,
      prompt: 'consent',
    });

    return {
      url: `${DISCORD_OAUTH_URL}?${params.toString()}`,
      state,
    };
  }, {
    query: t.Object({
      redirect_uri: t.Optional(t.String()),
    }),
  })

  /**
   * OAuth2 callback - exchange code for tokens and login/register user
   */
  .post('/callback', async ({ body, set }) => {
    try {
      const { code, redirect_uri } = body;

      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
        set.status = 500;
        return { error: 'Discord OAuth not configured' };
      }

      // Exchange code for tokens
      const tokens = await exchangeCode(code, redirect_uri || env.DISCORD_REDIRECT_URI!);
      
      // Get Discord user info
      const discordUser = await getDiscordUser(tokens.access_token);
      
      logger.info(`Discord OAuth login: ${discordUser.username} (${discordUser.id})`);

      // Check if user exists by Discord ID
      let [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.discordId, discordUser.id))
        .limit(1);

      // If not found by Discord ID, check by email
      if (!existingUser && discordUser.email) {
        [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, discordUser.email))
          .limit(1);

        // Link Discord to existing email account
        if (existingUser) {
          await db
            .update(users)
            .set({
              discordId: discordUser.id,
              discordUsername: discordUser.username,
              discordAvatar: discordUser.avatar,
              discordAccessToken: encrypt(tokens.access_token),
              discordRefreshToken: encrypt(tokens.refresh_token),
              discordTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
              lastLogin: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));
        }
      }

      // Create new user if doesn't exist
      if (!existingUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            username: discordUser.username,
            email: discordUser.email || `${discordUser.id}@discord.local`,
            passwordHash: null, // OAuth users don't need password
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar,
            discordAccessToken: encrypt(tokens.access_token),
            discordRefreshToken: encrypt(tokens.refresh_token),
            discordTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
            lastLogin: new Date(),
          })
          .returning();

        existingUser = newUser;
        logger.info(`New user created via Discord OAuth: ${discordUser.username}`);
      } else {
        // Update existing user's Discord tokens
        await db
          .update(users)
          .set({
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar,
            discordAccessToken: encrypt(tokens.access_token),
            discordRefreshToken: encrypt(tokens.refresh_token),
            discordTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
            lastLogin: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }

      // Generate JWT for dashboard
      const jwtToken = sign(
        { userId: existingUser.id, email: existingUser.email },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      return {
        token: jwtToken,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordAvatar: discordUser.avatar,
          lastLogin: new Date(),
        },
      };
    } catch (error) {
      logger.error('Discord OAuth callback error:', error);
      set.status = 500;
      return { error: 'OAuth authentication failed' };
    }
  }, {
    body: t.Object({
      code: t.String(),
      redirect_uri: t.Optional(t.String()),
    }),
  })

  /**
   * Get user's Discord guilds (requires valid OAuth session)
   */
  .get('/guilds', async ({ headers, set }) => {
    try {
      // Get user from JWT
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      // Verify JWT and get user
      const token = authHeader.substring(7);
      const payload = require('jsonwebtoken').verify(token, env.JWT_SECRET) as { userId: number };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.discordAccessToken) {
        set.status = 401;
        return { error: 'Discord not linked' };
      }

      // Decrypt access token
      const accessToken = decrypt(user.discordAccessToken);

      // Check if token expired and refresh if needed
      if (user.discordTokenExpires && new Date(user.discordTokenExpires) < new Date()) {
        if (!user.discordRefreshToken) {
          set.status = 401;
          return { error: 'Discord session expired' };
        }

        try {
          const newTokens = await refreshToken(decrypt(user.discordRefreshToken));
          
          await db
            .update(users)
            .set({
              discordAccessToken: encrypt(newTokens.access_token),
              discordRefreshToken: encrypt(newTokens.refresh_token),
              discordTokenExpires: new Date(Date.now() + newTokens.expires_in * 1000),
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

          const guilds = await getDiscordGuilds(newTokens.access_token);
          return { guilds };
        } catch {
          set.status = 401;
          return { error: 'Failed to refresh Discord session' };
        }
      }

      const guilds = await getDiscordGuilds(accessToken);
      return { guilds };
    } catch (error) {
      logger.error('Get Discord guilds error:', error);
      set.status = 500;
      return { error: 'Failed to get guilds' };
    }
  })

  /**
   * Check if Discord is linked to account
   */
  .get('/status', async ({ headers, set }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const token = authHeader.substring(7);
      const payload = require('jsonwebtoken').verify(token, env.JWT_SECRET) as { userId: number };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      return {
        linked: !!user.discordId,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        discordAvatar: user.discordAvatar,
        tokenValid: user.discordTokenExpires ? new Date(user.discordTokenExpires) > new Date() : false,
      };
    } catch (error) {
      logger.error('Discord status check error:', error);
      set.status = 500;
      return { error: 'Failed to check Discord status' };
    }
  })

  /**
   * Unlink Discord from account
   */
  .delete('/unlink', async ({ headers, set }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const token = authHeader.substring(7);
      const payload = require('jsonwebtoken').verify(token, env.JWT_SECRET) as { userId: number };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      // Check if user has password (can unlink Discord)
      if (!user.passwordHash) {
        set.status = 400;
        return { error: 'Cannot unlink Discord - no password set. Set a password first.' };
      }

      await db
        .update(users)
        .set({
          discordId: null,
          discordUsername: null,
          discordAvatar: null,
          discordAccessToken: null,
          discordRefreshToken: null,
          discordTokenExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return { success: true, message: 'Discord unlinked' };
    } catch (error) {
      logger.error('Discord unlink error:', error);
      set.status = 500;
      return { error: 'Failed to unlink Discord' };
    }
  });
