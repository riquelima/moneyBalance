import { describe, it, expect } from 'vitest';
import { buildMonthly2026, monthNamePT } from '../pages/Chat';

describe('monthly 2026 payload structure', () => {
  const tx = [
    { id: 't1', nomeTransacao: 'Salário', descricao: 'Salário', valor: '5000.00', valor_num: 5000, data: '2026-01-01', timestamp: '2026-01-01T08:00:00Z', tipo: 'entrada', categoria: 'Salário', pago: true },
    { id: 't2', nomeTransacao: 'Mercado', descricao: 'Mercado', valor: '250.50', valor_num: 250.50, data: '2026-02-02', timestamp: '2026-02-02T12:00:00Z', tipo: 'saída', categoria: 'Alimentação', pago: true },
  ];

  it('includes 12 months and headers in Portuguese', () => {
    const months = buildMonthly2026(tx as any);
    expect(months.length).toBe(12);
    expect(months[0].header).toBe('Janeiro 2026');
    expect(months[1].header).toBe('Fevereiro 2026');
    expect(monthNamePT(12)).toBe('Dezembro');
  });

  it('populates entries/expenses and keeps empty months', () => {
    const months = buildMonthly2026(tx as any);
    const jan = months.find(m => m.mes === 1);
    const feb = months.find(m => m.mes === 2);
    const mar = months.find(m => m.mes === 3);
    expect(jan?.entradas.length).toBe(1);
    expect(jan?.saidas.length).toBe(0);
    expect(feb?.saidas.length).toBe(1);
    expect(feb?.entradas.length).toBe(0);
    expect(mar?.entradas.length).toBe(0);
    expect(mar?.saidas.length).toBe(0);
  });
});
