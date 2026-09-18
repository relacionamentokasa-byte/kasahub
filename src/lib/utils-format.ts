// Currency formatting remains independent from the global privacy control.
// The authenticated shell masks every rendered digit through CSS, so opening
// the eye always restores the original value without stale formatter output.
export function brlForce(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function brl(v: number) {
  return brlForce(v);
}
