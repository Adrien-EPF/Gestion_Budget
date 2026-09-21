import type { AppSettings, DataService, SettingKey } from '../services/dataService';
import { checkReminderCopy, monthlyBudgetReviewCopy } from '../utils/notificationCopy';
import type { NotificationScheduler, NotificationSpec } from './scheduler';

type NotificationSetting = Extract<SettingKey, 'checkReminderEnabled' | 'monthlyBudgetReviewEnabled'>;

/** The notification each switch of Réglages stands for. */
const notificationFor: Record<NotificationSetting, NotificationSpec> = {
  checkReminderEnabled: {
    id: 'check-reminder',
    ...checkReminderCopy,
    trigger: { type: 'weekly', weekday: 1, hour: 18, minute: 0 },
  },
  monthlyBudgetReviewEnabled: {
    id: 'monthly-budget-review',
    ...monthlyBudgetReviewCopy,
    trigger: { type: 'monthly', day: 1, hour: 9, minute: 0 },
  },
};

const settings = Object.keys(notificationFor) as NotificationSetting[];

export function isNotificationSetting(key: SettingKey): key is NotificationSetting {
  return key in notificationFor;
}

const sameSpec = (a: NotificationSpec, b: NotificationSpec) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Makes the scheduled notifications match the switches: the persisted
 * settings are the single source of truth. Plans what is missing or
 * out of date, cancels what should not be there any more, and switches
 * off a setting whose permission was taken back in the system settings.
 */
export async function reconcileNotifications(
  dataService: Pick<DataService, 'getSettings' | 'setSetting'>,
  scheduler: NotificationScheduler
): Promise<void> {
  const current: AppSettings = await dataService.getSettings();
  const granted = await scheduler.hasPermission();
  const scheduled = new Map((await scheduler.listScheduled()).map((spec) => [spec.id, spec]));

  for (const setting of settings) {
    const spec = notificationFor[setting];
    if (current[setting] && !granted) await dataService.setSetting(setting, false);

    if (current[setting] && granted) {
      const existing = scheduled.get(spec.id);
      if (!existing || !sameSpec(existing, spec)) await scheduler.schedule(spec);
    } else if (scheduled.has(spec.id)) {
      await scheduler.cancel(spec.id);
    }
  }
}

/**
 * A switch of Réglages was flipped. Turning one on asks for the permission
 * first; if it is refused nothing is saved, so the switch stays off.
 * Resolves to whether the switch now has the requested value.
 */
export async function setNotificationSetting(
  dataService: Pick<DataService, 'getSettings' | 'setSetting'>,
  scheduler: NotificationScheduler,
  key: NotificationSetting,
  value: boolean
): Promise<boolean> {
  if (value && !(await scheduler.requestPermission())) {
    await dataService.setSetting(key, false);
    return false;
  }
  await dataService.setSetting(key, value);
  await reconcileNotifications(dataService, scheduler);
  return true;
}
