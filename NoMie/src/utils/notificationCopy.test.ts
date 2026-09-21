import { checkReminderCopy, monthlyBudgetReviewCopy } from './notificationCopy';

describe('Textes des notifications', () => {
  it.each([
    ['rappel de pointage', checkReminderCopy],
    ['point budget mensuel', monthlyBudgetReviewCopy],
  ])('the %s is never alarming', (_name, copy) => {
    const text = `${copy.title} ${copy.body}`;
    expect(text).not.toContain('!');
    expect(text).not.toMatch(/alerte|dépassement|retard|urgent|oubli|n['’]as pas/i);
  });

  it('the reminder invites rather than orders', () => {
    expect(checkReminderCopy.body).toBe('Un petit moment pour pointer tes opérations ?');
  });
});
