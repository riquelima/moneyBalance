export const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const parseLocalISODate = (iso: string) => {
  const [y, m, dd] = String(iso).split('T')[0].split('-').map(Number);
  return new Date(y, (m || 1) - 1, dd || 1);
};

export const sameDay = (a: Date, b: Date) => {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
};

export const labelForDate = (iso: string, now: Date = new Date()) => {
  const d = parseLocalISODate(iso);
  const ytd = new Date(now);
  ytd.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Hoje';
  if (sameDay(d, ytd)) return 'Ontem';
  return d.toLocaleDateString('pt-BR');
};

export const daysInMonth = (year: number, monthIndex: number) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

export const computeDailyRecommended = (monthBalance: number, year: number, monthIndex: number) => {
  const dim = daysInMonth(year, monthIndex);
  if (dim <= 0) return { value: 0, error: true };
  if (monthBalance <= 0) return { value: 0, error: true };
  return { value: monthBalance / dim, error: false };
};

export const selectSingleCardIndex = (selectedTimeframe: '6meses' | '1ano' | '5anos', total: number) => {
  const map: Record<'6meses' | '1ano' | '5anos', number> = { '6meses': 0, '1ano': 1, '5anos': 2 };
  const idx = map[selectedTimeframe] ?? 0;
  if (total <= 0) return -1;
  return Math.min(idx, total - 1);
};
