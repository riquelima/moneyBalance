import { describe, it, expect } from 'vitest';
import { parseLocalISODate, toLocalISO, labelForDate } from '../utils/date';

describe('date utils', () => {
  it('parseLocalISODate parses YYYY-MM-DD as local date', () => {
    const d = parseLocalISODate('2026-01-14');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(14);
  });

  it('toLocalISO formats Date as YYYY-MM-DD', () => {
    const s = toLocalISO(new Date(2026, 0, 14));
    expect(s).toBe('2026-01-14');
  });

  it('labelForDate returns Hoje, Ontem or localized date', () => {
    const now = new Date(2026, 0, 14);
    const isoToday = toLocalISO(now);
    const isoYtd = toLocalISO(new Date(2026, 0, 13));
    const other = '2026-01-10';
    expect(labelForDate(isoToday, now)).toBe('Hoje');
    expect(labelForDate(isoYtd, now)).toBe('Ontem');
    expect(labelForDate(other, now)).toBe('10/01/2026');
  });
});

