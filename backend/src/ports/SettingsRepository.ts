import type { IsoDate, UserSettings } from '../domain/types.js';

export interface SettingsRepository {
  get(userId: number): UserSettings | null;
  initialize(userId: number, startDate: IsoDate, timeZone: string): void;
}
