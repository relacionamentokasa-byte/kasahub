/**
 * Regra ÚNICA de valor financeiro efetivo do módulo Financeiro.
 *
 * PAGO (paid):
 *   - usa `valor_real` quando existir e for > 0;
 *   - senão usa `amount`.
 * PENDENTE (pending) e demais status não pagos:
 *   - usa `valor_previsto` quando existir e for > 0;
 *   - senão usa `amount`.
 *
 * Esta função é a fonte de verdade para: tabela do Fluxo de Caixa,
 * indicadores (A Receber / A Pagar / Realizado), saldo do período e
 * saldo das contas bancárias.
 */
export type FinanceValueSource = {
  status?: string | null;
  amount?: number | string | null;
  valor_previsto?: number | string | null;
  valor_real?: number | string | null;
  paid_value?: number | string | null;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function isPaidStatus(status: string | null | undefined): boolean {
  return String(status || "").toLowerCase() === "paid";
}

export function effectiveAmount(t: FinanceValueSource | null | undefined): number {
  if (!t) return 0;
  const amount = num(t.amount);
  if (isPaidStatus(t.status)) {
    const real = num(t.valor_real ?? t.paid_value);
    return real > 0 ? real : amount;
  }
  const previsto = num(t.valor_previsto);
  return previsto > 0 ? previsto : amount;
}
