/**
 * When a notification fires. `weekday` follows expo's numbering
 * (1 = Sunday … 7 = Saturday), `day` is the day of the month.
 */
export type NotificationTrigger =
  | { type: 'weekly'; weekday: number; hour: number; minute: number }
  | { type: 'monthly'; day: number; hour: number; minute: number };

/** Where a tap on a notification should land; carried in the notification's data. */
export type NotificationDestination = { screen: 'Comptes' | 'Budgets' };

export type NotificationSpec = {
  /** Stable key: scheduling the same id again replaces the previous notification. */
  id: string;
  title: string;
  body: string;
  trigger: NotificationTrigger;
  data?: { destination: NotificationDestination };
};

/**
 * The narrow seam to the operating system's local notifications: the one
 * place a substitute is legitimate in tests (#11 « Testing Decisions »).
 */
export interface NotificationScheduler {
  /** Whether notifications are already allowed, without asking. */
  hasPermission(): Promise<boolean>;
  /** Asks for the permission if it has not been granted yet; resolves to the outcome. */
  requestPermission(): Promise<boolean>;
  /** Schedules a repeating notification, replacing the one with the same id. */
  schedule(spec: NotificationSpec): Promise<void>;
  cancel(id: string): Promise<void>;
  listScheduled(): Promise<NotificationSpec[]>;
}
