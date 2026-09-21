import type { NotificationScheduler, NotificationSpec } from './scheduler';

export type InMemoryScheduler = NotificationScheduler & {
  /** What the next permission prompt answers. */
  setPermissionAnswer(granted: boolean): void;
  /** Simulates the user revoking or granting the permission in the system settings. */
  setGranted(granted: boolean): void;
  /** How many times the user was prompted. */
  readonly promptCount: number;
};

/**
 * Scheduler that keeps everything in memory: the stand-in for the OS in
 * tests, and the inert scheduler on the web, where local notifications
 * are not available (#11 « Plateformes »).
 */
export function createInMemoryScheduler(options: { granted?: boolean; answer?: boolean } = {}): InMemoryScheduler {
  let granted = options.granted ?? false;
  let answer = options.answer ?? true;
  let promptCount = 0;
  const scheduled = new Map<string, NotificationSpec>();

  return {
    async hasPermission() {
      return granted;
    },
    async requestPermission() {
      if (!granted) {
        promptCount++;
        granted = answer;
      }
      return granted;
    },
    async schedule(spec) {
      scheduled.set(spec.id, spec);
    },
    async cancel(id) {
      scheduled.delete(id);
    },
    async listScheduled() {
      return [...scheduled.values()];
    },
    setPermissionAnswer(value) {
      answer = value;
    },
    setGranted(value) {
      granted = value;
    },
    get promptCount() {
      return promptCount;
    },
  };
}

/** Web: nothing to schedule, nothing to ask, nothing that can fail. */
export function createInertScheduler(): NotificationScheduler {
  return {
    async hasPermission() {
      return true;
    },
    async requestPermission() {
      return true;
    },
    async schedule() {},
    async cancel() {},
    async listScheduled() {
      return [];
    },
  };
}
