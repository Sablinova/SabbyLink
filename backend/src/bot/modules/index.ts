/**
 * Bot Modules Index
 * Exports all available bot modules
 */

export { AFKModule } from './afk';
export { AutoReactionsModule } from './auto-reactions';
export { NitroSniperModule } from './nitro-sniper';

// Module types for registration
export type ModuleName = 'afk' | 'autoReactions' | 'nitroSniper';

export interface ModuleConfig {
  name: ModuleName;
  enabled: boolean;
}
