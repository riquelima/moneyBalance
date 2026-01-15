import { describe, it, expect } from 'vitest';
import { buildWebhookPayload } from '../pages/Chat';

describe('buildWebhookPayload', () => {
  const user = { id: 'u1', email: 'user@example.com', user_metadata: { name: 'Henrique', lastName: 'Lima' } };
  const profile = { display_name: 'Henrique Lima', avatar_url: 'http://example.com/a.png' };
  const categories = [
    { id: 'c1', name: 'Alimentação' },
    { id: 'c2', name: 'Transporte' }
  ];
  const transactions = [
    { id: 't1', description: 'Mercado', amount: 250.5, type: 'expense', date: '2026-01-02', is_paid: true, category_id: 'c1' },
    { id: 't2', description: 'Salário', amount: 5000, type: 'income', date: '2026-01-01', is_paid: true },
    { id: 't3', description: 'Uber', amount: 35.75, type: 'expense', date: '2026-02-10', is_paid: false, category_id: 'c2' }
  ];

  it('groups by month/year and formats values with 2 decimals', () => {
    const payload = buildWebhookPayload(user as any, transactions as any, categories as any, profile as any);
    expect(payload.cliente.nome).toContain('Henrique');
    expect(payload.metadados.totalRegistros).toBe(3);
    expect(Array.isArray(payload.historico)).toBe(true);
    expect(payload.mesAtual).toBeTruthy();
    expect(payload.ano2026['2026-01']).toBeTruthy();
    expect(payload.ano2026['2026-02']).toBeTruthy();
    // Two months present: Jan (1) and Feb (2)
    const jan = payload.historico.find((x: any) => x.mes === 1 && x.ano === 2026);
    const feb = payload.historico.find((x: any) => x.mes === 2 && x.ano === 2026);
    expect(jan).toBeTruthy();
    expect(feb).toBeTruthy();
    // Check entries and expenses
    expect(jan.entradas.length).toBe(1);
    expect(jan.saidas.length).toBe(1);
    expect(jan.saidas[0].valor).toBe('250.50');
    // Check category mapping
    expect(feb.categoriasPorNome['Transporte'].length).toBe(1);
  });
});
