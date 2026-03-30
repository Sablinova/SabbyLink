import { botManager } from './index';
import { db } from '../db';
import { rpcConfigs, rpcStates } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { RichPresence } from 'discord.js-selfbot-v13';

// Platform application IDs for RPC emulation
const PLATFORM_APP_IDS = {
  xbox: '438122941302046720', // Xbox Live
  playstation: '457187773180952576', // PlayStation Network
  pc: '383226320970055681', // Generic PC Gaming
  mobile: '367827983903490050', // Generic Mobile
  switch: '465578643946807297', // Nintendo Switch
  custom: null, // User provides their own
};

interface RPCState {
  userId: number;
  configId: number;
  currentStateIndex: number;
  states: any[];
  intervalId?: NodeJS.Timeout;
}

class RPCManager {
  private activeRPCs: Map<number, RPCState> = new Map();

  async start(userId: number): Promise<void> {
    // Get enabled RPC config
    const config = await db.query.rpcConfigs.findFirst({
      where: and(eq(rpcConfigs.userId, userId), eq(rpcConfigs.enabled, true)),
      with: {
        states: {
          orderBy: (states, { asc }) => [asc(states.order)],
        },
      },
    });

    if (!config || !config.states || config.states.length === 0) {
      logger.debug(`No enabled RPC config for user: ${userId}`);
      return;
    }

    const client = botManager.getClient(userId);
    if (!client || !client.user) {
      logger.warn(`Cannot start RPC: bot not ready for user ${userId}`);
      return;
    }

    // Stop existing RPC if running
    this.stop(userId);

    const rpcState: RPCState = {
      userId,
      configId: config.id,
      currentStateIndex: 0,
      states: config.states,
    };

    this.activeRPCs.set(userId, rpcState);

    // Set initial presence
    await this.updatePresence(userId);

    // If multiple states, setup rotation
    if (config.states.length > 1) {
      const firstDuration = config.states[0].duration || 60;
      rpcState.intervalId = setInterval(() => {
        this.rotateState(userId);
      }, firstDuration * 1000);
    }

    logger.info(`RPC started for user: ${userId}, config: ${config.id}`);
  }

  async stop(userId: number): Promise<void> {
    const rpcState = this.activeRPCs.get(userId);
    if (!rpcState) return;

    // Clear interval
    if (rpcState.intervalId) {
      clearInterval(rpcState.intervalId);
    }

    // Clear presence
    const client = botManager.getClient(userId);
    if (client && client.user) {
      await client.user.setPresence({ activities: [] });
    }

    this.activeRPCs.delete(userId);
    logger.info(`RPC stopped for user: ${userId}`);
  }

  async restart(userId: number): Promise<void> {
    await this.stop(userId);
    await this.start(userId);
  }

  private async rotateState(userId: number): Promise<void> {
    const rpcState = this.activeRPCs.get(userId);
    if (!rpcState) return;

    // Move to next state
    rpcState.currentStateIndex =
      (rpcState.currentStateIndex + 1) % rpcState.states.length;

    // Update presence
    await this.updatePresence(userId);

    // Update interval for next rotation
    const currentState = rpcState.states[rpcState.currentStateIndex];
    const nextDuration = currentState.duration || 60;

    if (rpcState.intervalId) {
      clearInterval(rpcState.intervalId);
    }

    if (rpcState.states.length > 1) {
      rpcState.intervalId = setInterval(() => {
        this.rotateState(userId);
      }, nextDuration * 1000);
    }
  }

  private async updatePresence(userId: number): Promise<void> {
    const rpcState = this.activeRPCs.get(userId);
    if (!rpcState) return;

    const client = botManager.getClient(userId);
    if (!client || !client.user) return;

    const config = await db.query.rpcConfigs.findFirst({
      where: eq(rpcConfigs.id, rpcState.configId),
    });

    if (!config) return;

    const state = rpcState.states[rpcState.currentStateIndex];

    try {
      // Get application ID for platform
      const applicationId =
        config.platform === 'custom'
          ? state.applicationId
          : PLATFORM_APP_IDS[config.platform as keyof typeof PLATFORM_APP_IDS];

      if (!applicationId) {
        logger.warn(`No application ID for platform: ${config.platform}`);
        return;
      }

      // Build presence object
      const presence: any = {
        activities: [
          {
            name: config.name,
            type: 0, // Playing
            applicationId,
            details: state.details || undefined,
            state: state.state || undefined,
            timestamps: this.buildTimestamps(state),
            assets: this.buildAssets(state),
            party: this.buildParty(state),
            buttons: this.buildButtons(state),
          },
        ],
        status: 'online',
      };

      await client.user.setPresence(presence);

      logger.debug(
        `Updated RPC for user ${userId}: state ${rpcState.currentStateIndex + 1}/${rpcState.states.length}`
      );
    } catch (error) {
      logger.error(`Error updating RPC for user ${userId}:`, error);
    }
  }

  private buildTimestamps(state: any) {
    const timestamps: any = {};

    if (state.startTimestamp) {
      timestamps.start = Date.now();
    }

    if (state.endTimestamp) {
      timestamps.end = Date.now() + state.endTimestamp * 1000;
    }

    return Object.keys(timestamps).length > 0 ? timestamps : undefined;
  }

  private buildAssets(state: any) {
    const assets: any = {};

    if (state.largeImageKey) {
      assets.largeImage = state.largeImageKey;
      if (state.largeImageText) {
        assets.largeText = state.largeImageText;
      }
    }

    if (state.smallImageKey) {
      assets.smallImage = state.smallImageKey;
      if (state.smallImageText) {
        assets.smallText = state.smallImageText;
      }
    }

    return Object.keys(assets).length > 0 ? assets : undefined;
  }

  private buildParty(state: any) {
    if (state.partySize && state.partyMax) {
      return {
        size: [state.partySize, state.partyMax],
      };
    }
    return undefined;
  }

  private buildButtons(state: any) {
    if (state.buttons) {
      try {
        const buttons =
          typeof state.buttons === 'string'
            ? JSON.parse(state.buttons)
            : state.buttons;
        if (Array.isArray(buttons) && buttons.length > 0) {
          return buttons.slice(0, 2); // Max 2 buttons
        }
      } catch (error) {
        logger.error('Error parsing RPC buttons:', error);
      }
    }
    return undefined;
  }

  // Auto-start RPCs for active bots
  async autoStart() {
    try {
      const configs = await db.query.rpcConfigs.findMany({
        where: eq(rpcConfigs.enabled, true),
      });

      logger.info(`Auto-starting ${configs.length} RPCs...`);

      for (const config of configs) {
        try {
          await this.start(config.userId);
        } catch (error) {
          logger.error(
            `Failed to auto-start RPC for user ${config.userId}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error('RPC auto-start error:', error);
    }
  }
}

export const rpcManager = new RPCManager();
