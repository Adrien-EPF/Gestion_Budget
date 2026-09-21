import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationScheduler, NotificationSpec, NotificationTrigger } from './scheduler';

const CHANNEL_ID = 'default';
const { SchedulableTriggerInputTypes } = Notifications;

function toExpoTrigger(trigger: NotificationTrigger): Notifications.NotificationTriggerInput {
  return trigger.type === 'weekly'
    ? { type: SchedulableTriggerInputTypes.WEEKLY, weekday: trigger.weekday, hour: trigger.hour, minute: trigger.minute }
    : { type: SchedulableTriggerInputTypes.MONTHLY, day: trigger.day, hour: trigger.hour, minute: trigger.minute };
}

function fromExpoTrigger(trigger: unknown): NotificationTrigger | null {
  const t = trigger as Record<string, unknown> | null;
  if (t?.type === 'weekly') {
    return { type: 'weekly', weekday: t.weekday as number, hour: t.hour as number, minute: t.minute as number };
  }
  if (t?.type === 'monthly') {
    return { type: 'monthly', day: t.day as number, hour: t.hour as number, minute: t.minute as number };
  }
  return null;
}

/** Local notifications through `expo-notifications`; no server involved (ADR 0001). */
export function createExpoNotificationScheduler(): NotificationScheduler {
  // A notification arriving while the app is open is still shown.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  async function ensureChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return {
    async hasPermission() {
      return (await Notifications.getPermissionsAsync()).granted;
    },
    async requestPermission() {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      // Android 13+ needs the channel to exist before it will show the prompt.
      await ensureChannel();
      return (await Notifications.requestPermissionsAsync()).granted;
    },
    async schedule(spec) {
      await ensureChannel();
      await Notifications.scheduleNotificationAsync({
        identifier: spec.id,
        content: { title: spec.title, body: spec.body, data: spec.data ?? {} },
        trigger: toExpoTrigger(spec.trigger),
      });
    },
    async cancel(id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    },
    async listScheduled() {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      const specs: NotificationSpec[] = [];
      for (const { identifier, content, trigger } of requests) {
        const mapped = fromExpoTrigger(trigger);
        if (!mapped) continue;
        const data = content.data as NotificationSpec['data'];
        specs.push({
          id: identifier,
          title: content.title ?? '',
          body: content.body ?? '',
          trigger: mapped,
          ...(data && 'destination' in data ? { data } : {}),
        });
      }
      return specs;
    },
  };
}
