import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { aiConfigs, aiConversations, aiMessages } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { aiManager } from '../../ai';
import { encrypt, decrypt } from '../../utils/crypto';

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .get('/providers', () => {
    const providers = aiManager.listProviders();
    return { providers };
  })
  .get('/configs', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const configs = await db.query.aiConfigs.findMany({
        where: eq(aiConfigs.userId, userId),
        orderBy: [desc(aiConfigs.createdAt)],
      });

      // Decrypt API keys for display (show only last 4 chars)
      const configsWithMaskedKeys = configs.map((config) => ({
        ...config,
        apiKey: config.apiKey
          ? `****${decrypt(config.apiKey).slice(-4)}`
          : null,
      }));

      return { configs: configsWithMaskedKeys };
    } catch (error) {
      logger.error('Get AI configs error:', error);
      set.status = 500;
      return { error: 'Failed to get AI configs' };
    }
  })
  .post(
    '/configs',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const { provider, apiKey, baseURL, model, systemPrompt, temperature, maxTokens } = body;

        // Encrypt API key
        const encryptedKey = apiKey ? encrypt(apiKey) : null;

        const [config] = await db
          .insert(aiConfigs)
          .values({
            userId,
            provider,
            apiKey: encryptedKey,
            baseURL,
            model,
            systemPrompt,
            temperature,
            maxTokens,
            enabled: true,
          })
          .returning();

        logger.info(`AI config created: ${config.id} for user: ${userId}`);
        return { config: { ...config, apiKey: apiKey ? `****${apiKey.slice(-4)}` : null } };
      } catch (error) {
        logger.error('Create AI config error:', error);
        set.status = 500;
        return { error: 'Failed to create AI config' };
      }
    },
    {
      body: t.Object({
        provider: t.String(),
        apiKey: t.Optional(t.String()),
        baseURL: t.Optional(t.String()),
        model: t.Optional(t.String()),
        systemPrompt: t.Optional(t.String()),
        temperature: t.Optional(t.Number()),
        maxTokens: t.Optional(t.Number()),
      }),
    }
  )
  .post(
    '/chat',
    async ({ userId, body, set }) => {
      if (!userId) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      try {
        const { configId, message, conversationId } = body;

        // Get AI config
        const config = await db.query.aiConfigs.findFirst({
          where: and(eq(aiConfigs.id, configId), eq(aiConfigs.userId, userId)),
        });

        if (!config) {
          set.status = 404;
          return { error: 'AI config not found' };
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
          conversation = await db.query.aiConversations.findFirst({
            where: and(
              eq(aiConversations.id, conversationId),
              eq(aiConversations.userId, userId)
            ),
          });
        }

        if (!conversation) {
          const [newConv] = await db
            .insert(aiConversations)
            .values({
              userId,
              aiConfigId: configId,
              title: message.substring(0, 50) + '...',
            })
            .returning();
          conversation = newConv;
        }

        // Get conversation history
        const history = await db.query.aiMessages.findMany({
          where: eq(aiMessages.conversationId, conversation.id),
          orderBy: [desc(aiMessages.createdAt)],
          limit: 20,
        });

        // Build messages array
        const messages = [
          ...(config.systemPrompt
            ? [{ role: 'system' as const, content: config.systemPrompt }]
            : []),
          ...history.reverse().map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user' as const, content: message },
        ];

        // Decrypt API key
        const apiKey = config.apiKey ? decrypt(config.apiKey) : undefined;

        // Get AI response
        const response = await aiManager.chat(config.provider, messages, {
          provider: config.provider,
          apiKey,
          baseURL: config.baseURL || undefined,
          model: config.model || undefined,
          temperature: config.temperature || undefined,
          maxTokens: config.maxTokens || undefined,
        });

        // Save user message
        await db.insert(aiMessages).values({
          conversationId: conversation.id,
          role: 'user',
          content: message,
        });

        // Save assistant response
        await db.insert(aiMessages).values({
          conversationId: conversation.id,
          role: 'assistant',
          content: response.content,
        });

        // Update conversation
        await db
          .update(aiConversations)
          .set({
            messageCount: conversation.messageCount + 2,
            lastMessageAt: new Date(),
          })
          .where(eq(aiConversations.id, conversation.id));

        return {
          conversationId: conversation.id,
          message: response.content,
          usage: response.usage,
        };
      } catch (error) {
        logger.error('AI chat error:', error);
        set.status = 500;
        return { error: error instanceof Error ? error.message : 'AI chat failed' };
      }
    },
    {
      body: t.Object({
        configId: t.Number(),
        message: t.String(),
        conversationId: t.Optional(t.Number()),
      }),
    }
  )
  .get('/conversations', async ({ userId, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const conversations = await db.query.aiConversations.findMany({
        where: eq(aiConversations.userId, userId),
        orderBy: [desc(aiConversations.lastMessageAt)],
        limit: 50,
        with: {
          aiConfig: true,
        },
      });

      return { conversations };
    } catch (error) {
      logger.error('Get conversations error:', error);
      set.status = 500;
      return { error: 'Failed to get conversations' };
    }
  })
  .get('/conversations/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const conversationId = parseInt(params.id);

      const conversation = await db.query.aiConversations.findFirst({
        where: and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        ),
        with: {
          aiConfig: true,
        },
      });

      if (!conversation) {
        set.status = 404;
        return { error: 'Conversation not found' };
      }

      const messages = await db.query.aiMessages.findMany({
        where: eq(aiMessages.conversationId, conversationId),
        orderBy: [desc(aiMessages.createdAt)],
      });

      return {
        conversation,
        messages: messages.reverse(),
      };
    } catch (error) {
      logger.error('Get conversation error:', error);
      set.status = 500;
      return { error: 'Failed to get conversation' };
    }
  })
  .delete('/conversations/:id', async ({ userId, params, set }) => {
    if (!userId) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const conversationId = parseInt(params.id);

      // Delete messages first
      await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));

      // Delete conversation
      const result = await db
        .delete(aiConversations)
        .where(
          and(
            eq(aiConversations.id, conversationId),
            eq(aiConversations.userId, userId)
          )
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: 'Conversation not found' };
      }

      logger.info(`Conversation deleted: ${conversationId}`);
      return { message: 'Conversation deleted successfully' };
    } catch (error) {
      logger.error('Delete conversation error:', error);
      set.status = 500;
      return { error: 'Failed to delete conversation' };
    }
  });
