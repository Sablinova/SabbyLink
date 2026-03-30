import { Elysia } from 'elysia';
import { db } from '../../db';
import { analyticsPetDaily, messageLogs, commandLogs } from '../../db/schema';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
  .get('/overview', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      // Get today's analytics
      const today = new Date().toISOString().split('T')[0];
      
      const todayStats = await db.query.analyticsPetDaily.findFirst({
        where: and(
          eq(analyticsPetDaily.userId, userId),
          eq(analyticsPetDaily.date, today)
        ),
      });

      // Get last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const weekStats = await db.query.analyticsPetDaily.findMany({
        where: and(
          eq(analyticsPetDaily.userId, userId),
          gte(analyticsPetDaily.date, sevenDaysAgo.toISOString().split('T')[0])
        ),
        orderBy: [desc(analyticsPetDaily.date)],
      });

      // Calculate totals for the week
      const weekTotals = weekStats.reduce(
        (acc, day) => ({
          messagesSent: acc.messagesSent + day.messagesSent,
          messagesReceived: acc.messagesReceived + day.messagesReceived,
          commandsExecuted: acc.commandsExecuted + day.commandsExecuted,
        }),
        { messagesSent: 0, messagesReceived: 0, commandsExecuted: 0 }
      );

      return {
        today: todayStats || {
          messagesSent: 0,
          messagesReceived: 0,
          commandsExecuted: 0,
        },
        week: {
          total: weekTotals,
          daily: weekStats,
        },
      };
    } catch (error) {
      logger.error('Get analytics overview error:', error);
      set.status = 500;
      return { error: 'Failed to get analytics overview' };
    }
  })
  .get('/messages', async ({ userId, query, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const { startDate, endDate, limit = '100' } = query;

      let queryBuilder = db.query.messageLogs.findMany({
        where: eq(messageLogs.userId, userId),
        orderBy: [desc(messageLogs.createdAt)],
        limit: parseInt(limit as string),
      });

      // Apply date filters if provided
      // Note: Drizzle query builder is immutable, so we need to rebuild
      if (startDate || endDate) {
        const conditions = [eq(messageLogs.userId, userId)];
        
        if (startDate) {
          conditions.push(gte(messageLogs.createdAt, new Date(startDate as string)));
        }
        
        if (endDate) {
          conditions.push(lte(messageLogs.createdAt, new Date(endDate as string)));
        }

        queryBuilder = db.query.messageLogs.findMany({
          where: and(...conditions),
          orderBy: [desc(messageLogs.createdAt)],
          limit: parseInt(limit as string),
        });
      }

      const messages = await queryBuilder;

      return { messages };
    } catch (error) {
      logger.error('Get message analytics error:', error);
      set.status = 500;
      return { error: 'Failed to get message analytics' };
    }
  })
  .get('/commands', async ({ userId, query, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const { startDate, endDate, limit = '100' } = query;

      let conditions = [eq(commandLogs.userId, userId)];
      
      if (startDate) {
        conditions.push(gte(commandLogs.createdAt, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(commandLogs.createdAt, new Date(endDate as string)));
      }

      const commands = await db.query.commandLogs.findMany({
        where: and(...conditions),
        orderBy: [desc(commandLogs.createdAt)],
        limit: parseInt(limit as string),
      });

      return { commands };
    } catch (error) {
      logger.error('Get command analytics error:', error);
      set.status = 500;
      return { error: 'Failed to get command analytics' };
    }
  })
  .get('/stats', async ({ userId, query, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const { days = '30' } = query;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      const dailyStats = await db.query.analyticsPetDaily.findMany({
        where: and(
          eq(analyticsPetDaily.userId, userId),
          gte(analyticsPetDaily.date, daysAgo.toISOString().split('T')[0])
        ),
        orderBy: [desc(analyticsPetDaily.date)],
      });

      // Calculate totals
      const totals = dailyStats.reduce(
        (acc, day) => ({
          messagesSent: acc.messagesSent + day.messagesSent,
          messagesReceived: acc.messagesReceived + day.messagesReceived,
          commandsExecuted: acc.commandsExecuted + day.commandsExecuted,
          guildsJoined: acc.guildsJoined + day.guildsJoined,
        }),
        {
          messagesSent: 0,
          messagesReceived: 0,
          commandsExecuted: 0,
          guildsJoined: 0,
        }
      );

      return {
        totals,
        daily: dailyStats,
        period: {
          days: parseInt(days as string),
          start: daysAgo.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
      };
    } catch (error) {
      logger.error('Get stats error:', error);
      set.status = 500;
      return { error: 'Failed to get stats' };
    }
  });
