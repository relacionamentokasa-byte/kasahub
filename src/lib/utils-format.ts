// Reactive money formatting with global privacy mask.
// `brl(v)` respects the privacy flag (mask when hidden) — used everywhere by default.
// `brlForce(v)` ignores the flag — use ONLY inside the Financeiro module where the
// operator needs to see real values to lançar baixa, gerar boleto, recibo, etc.

let _hidden = false;
const _subs = new Set<() => void>();

export const MONEY_MASK = "R$ ••••••";

export function setMoneyHidden(v: boolean) {
  if (_hidden === v) return;
  _hidden = v;
  _subs.forEach((cb) => cb());
}

export function isMoneyHidden() {
  return _hidden;
}

export function subscribeMoneyHidden(cb: () => void) {
  _subs.add(cb);
  return () => _subs.delete(cb);
}

export function brlForce(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function brl(v: number) {
  if (_hidden) return MONEY_MASK;
  return brlForce(v);
}
