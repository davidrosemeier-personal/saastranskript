import { Users } from "../../repositories/users.js";
import { UsageLedger } from "../../repositories/usageLedger.js";
import { PlatformSettingsRepo } from "../../repositories/platformSettings.js";

const ROLLING_WINDOW_DAYS = 30;

/** Anchors the rolling window to the user's own cycle_start_at, per briefing §7. */
function currentCycleStart(cycleStartAt: Date, now: Date): Date {
  const msPerCycle = ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = now.getTime() - cycleStartAt.getTime();
  if (elapsed < 0) return cycleStartAt;
  const cyclesElapsed = Math.floor(elapsed / msPerCycle);
  return new Date(cycleStartAt.getTime() + cyclesElapsed * msPerCycle);
}

export interface UsageStatus {
  limitMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  cycleStart: Date;
}

export const UsageService = {
  async getStatus(userId: string): Promise<UsageStatus> {
    const user = await Users.findById(userId);
    if (!user) throw new Error("User not found");

    const [settings] = await Promise.all([PlatformSettingsRepo.get()]);
    const limitMinutes = user.usage_limit_minutes ?? settings.default_usage_limit_minutes;
    const cycleStart = currentCycleStart(new Date(user.cycle_start_at), new Date());
    const consumedMinutes = await UsageLedger.minutesConsumedSince(userId, cycleStart);

    return {
      limitMinutes,
      consumedMinutes,
      remainingMinutes: Math.max(0, limitMinutes - consumedMinutes),
      cycleStart,
    };
  },

  /** Hard block: rejects if the recording's estimated minutes would exceed the limit. */
  async assertWithinLimit(userId: string, additionalMinutes: number): Promise<void> {
    const status = await this.getStatus(userId);
    if (status.consumedMinutes + additionalMinutes > status.limitMinutes) {
      throw new UsageLimitExceededError(status);
    }
  },
};

export class UsageLimitExceededError extends Error {
  constructor(public status: UsageStatus) {
    super("Usage limit exceeded for current billing cycle");
    this.name = "UsageLimitExceededError";
  }
}
