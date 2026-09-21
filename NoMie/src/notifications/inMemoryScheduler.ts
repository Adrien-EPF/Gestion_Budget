import type { NotificationDestination, NotificationScheduler, NotificationSpec } from './scheduler';

export type InMemoryScheduler = NotificationScheduler & {
  /**
   * The user taps a notification. With no listener yet — the app was closed —
   * the tap waits for the app to subscribe, as a cold start does.
   */
  simulateTap(destination: NotificationDestination): void;
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
  const listeners = new Set<(destination: NotificationDestination) => void>();
  const waitingTaps: NotificationDestination[] = [];

  return {
    simulateTap(destination) {
      if (listeners.size === 0) waitingTaps.push(destination);
      else listeners.forEach((listener) => listener(destination));
    },
    onNotificationTap(listener) {
      listeners.add(listener);
      waitingTaps.splice(0).forEach(listener);
      return () => {
        listeners.delete(listener);
      };
    },
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
    onNotificationTap() {
      return () => {};
    },
  };
}
