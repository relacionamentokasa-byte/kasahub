import { Textarea } from "@/components/ui/textarea";

export function ScopeEditor({
  value,
  onChange,
}: {
  value: string | string[];
  onChange: (v: string) => void;
}) {
  const textValue = Array.isArray(value) ? value.join("\n") : (value || "");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={textValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Descreva o escopo do trabalho aqui... (negrito, itálico e listas serão mantidos na visualização)"
          className="min-h-[300px] bg-surface border-border rounded-xl p-4 shadow-sm resize-y"
        />
        <p className="text-[10px] text-muted-foreground italic px-1">
          Dica: Use quebras de linha para separar itens. Formatações básicas e colagens são suportadas.
        </p>
      </div>
    </div>
  );
}
