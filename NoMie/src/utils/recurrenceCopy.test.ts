import { describeAutomation, describeFrequency } from './recurrenceCopy';

describe('describeFrequency', () => {
  it('names the day of the month, the weekday or the date', () => {
    expect(describeFrequency('monthly', '2026-01-05')).toBe('Mensuelle · le 5');
    expect(describeFrequency('weekly', '2026-09-21')).toBe('Hebdomadaire · le lundi');
    expect(describeFrequency('yearly', '2026-03-12')).toBe('Annuelle · le 12 mars');
  });
});

describe('describeAutomation', () => {
  it('announces the next occurrence of an automatic rule', () => {
    expect(describeAutomation({ automatic: true, active: true, nextOccurrence: '2026-10-05' })).toEqual({
      label: 'Création automatique',
      hint: 'Prochaine : 5 octobre',
    });
  });

  it('reminds that a manual rule waits for the user', () => {
    expect(describeAutomation({ automatic: false, active: true, nextOccurrence: '2026-10-05' })).toEqual({
      label: 'Création manuelle',
      hint: 'À valider toi-même',
    });
  });

  it('says plainly when a rule is paused or over', () => {
    expect(describeAutomation({ automatic: true, active: false, nextOccurrence: null }).hint).toBe('Règle en pause');
    expect(describeAutomation({ automatic: true, active: true, nextOccurrence: null }).hint).toBe('Règle terminée');
  });
});
