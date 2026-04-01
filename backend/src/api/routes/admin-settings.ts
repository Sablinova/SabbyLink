/**
 * Admin System Settings Routes
 * 
 * Manages app-wide configuration stored in the database.
 * Only accessible by admin users.
 * Zero VPS configuration required - everything from dashboard.
 */

import { Elysia, t } from 'elysia';
import { 
  getAllSettings, 
  setSettings, 
  getSettingsMetadata,
  isDiscordOAuthConfigured,
  type SettingKey,
  SETTING_KEYS,
} from '@/config/settings';
import { logger } from '@/utils/logger';
import { db, users } from '@/db';
import { sql } from 'drizzle-orm';

// Cache for admin user ID to avoid DB queries on every request
let cachedAdminUserId: number | null = null;

// Get the first registered user (admin)
async function getAdminUserId(): Promise<number | null> {
  if (cachedAdminUserId !== null) {
    return cachedAdminUserId;
  }
  
  try {
    const result = db.select({ id: users.id })
      .from(users)
      .orderBy(sql`${users.id} ASC`)
      .limit(1)
      .get();
    
    if (result) {
      cachedAdminUserId = result.id;
      return cachedAdminUserId;
    }
  } catch (error) {
    logger.error('Failed to get admin user ID:', error);
  }
  
  return null;
}

// Check if user is admin (first registered user)
// TODO: Add proper role-based access control
async function isAdmin(userId: number): Promise<boolean> {
  const adminId = await getAdminUserId();
  return adminId !== null && userId === adminId;
}

export const adminSettingsRoutes = new Elysia({ prefix: '/api/v1/admin/settings' })
  // Get all system settings
  .get('/', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (!(await isAdmin(userId))) {
      set.status = 403;
      return { error: 'Admin access required' };
    }

    try {
      const settings = getAllSettings();
      const metadata = getSettingsMetadata();
      const oauthConfigured = isDiscordOAuthConfigured();

      return { 
        settings, 
        metadata,
        oauthConfigured,
      };
    } catch (error) {
      logger.error('Get admin settings error:', error);
      set.status = 500;
      return { error: 'Failed to get settings' };
    }
  })

  // Update system settings
  .put(
    '/',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      if (!(await isAdmin(userId))) {
        set.status = 403;
        return { error: 'Admin access required' };
      }

      try {
        const { settings } = body;

        // Validate that all keys are valid setting keys
        const validKeys = Object.values(SETTING_KEYS);
        for (const key of Object.keys(settings)) {
          if (!validKeys.includes(key as SettingKey)) {
            set.status = 400;
            return { error: `Invalid setting key: ${key}` };
          }
        }

        await setSettings(settings as Record<SettingKey, string | null>);
        
        logger.info(`Admin settings updated by user: ${userId}`);
        
        return { 
          message: 'Settings updated successfully',
          settings: getAllSettings(),
          oauthConfigured: isDiscordOAuthConfigured(),
        };
      } catch (error) {
        logger.error('Update admin settings error:', error);
        set.status = 500;
        return { error: 'Failed to update settings' };
      }
    },
    {
      body: t.Object({
        settings: t.Record(t.String(), t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // Check Discord OAuth status
  .get('/oauth-status', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (!(await isAdmin(userId))) {
      set.status = 403;
      return { error: 'Admin access required' };
    }

    try {
      const configured = isDiscordOAuthConfigured();
      return { 
        configured,
        message: configured 
          ? 'Discord OAuth is configured' 
          : 'Discord OAuth not configured. Set Client ID, Client Secret, and Redirect URI.',
      };
    } catch (error) {
      logger.error('Check OAuth status error:', error);
      set.status = 500;
      return { error: 'Failed to check OAuth status' };
    }
  })

  // Get setting metadata only (for building UI)
  .get('/metadata', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (!(await isAdmin(userId))) {
      set.status = 403;
      return { error: 'Admin access required' };
    }

    return { metadata: getSettingsMetadata() };
  });
