import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Trash2, CheckCircle2 } from "lucide-react";
import {
  type CallSheetGearItem,
  GEAR_CATEGORY_LABELS,
} from "@/types/call-sheet";

interface Props {
  gear: CallSheetGearItem[];
  onChange: (gear: CallSheetGearItem[]) => void;
}

export function CallSheetGearSection({ gear, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<CallSheetGearItem["category"]>("camera");

  const total = gear.length;
  const checkedCount = gear.filter((g) => g.checked).length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  const handleAdd = () => {
    if (!newName.trim()) return;

    const newItem: CallSheetGearItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: newName.trim(),
      category: newCat,
      checked: false,
    };

    onChange([...gear, newItem]);
    setNewName("");
  };

  const handleToggle = (id: string, checked: boolean) => {
    onChange(gear.map((g) => (g.id === id ? { ...g, checked } : g)));
  };

  const handleRemove = (id: string) => {
    onChange(gear.filter((g) => g.id !== id));
  };

  // Agrupando por categoria
  const categories = Object.keys(GEAR_CATEGORY_LABELS) as Array<CallSheetGearItem["category"]>;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground tracking-tight">Checklist de Equipamentos & Logística</h3>
          <span className="text-[10px] font-mono-kasa bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
            {checkedCount}/{total} conferidos ({progress}%)
          </span>
        </div>

        {total > 0 && (
          <div className="w-28 bg-muted/40 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progress === 100 ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Lista por Categorias */}
      {gear.length === 0 ? (
        <div className="py-6 border border-dashed border-border/60 rounded-lg text-center bg-muted/10">
          <p className="text-xs text-muted-foreground">Nenhum equipamento adicionado ao checklist.</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Adicione itens essenciais como câmeras, lentes, iluminação, áudio e baterias.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {categories.map((cat) => {
            const items = gear.filter((g) => g.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-1.5">
                <div className="text-[10px] font-mono-kasa font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <span>{GEAR_CATEGORY_LABELS[cat]}</span>
                  <span className="text-[9px] text-muted-foreground/60">({items.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        item.checked
                          ? "bg-emerald-500/5 border-emerald-500/20 text-muted-foreground"
                          : "bg-muted/10 border-border/50 text-foreground hover:bg-muted/20"
                      }`}
                    >
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(c) => handleToggle(item.id, !!c)}
                          className="size-3.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <span className={`text-xs truncate ${item.checked ? "line-through opacity-70" : "font-medium"}`}>
                          {item.name}
                        </span>
                      </label>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(item.id)}
                        className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0"
                        title="Remover item"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar Equipamento */}
      <div className="pt-2 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          <div className="sm:col-span-7">
            <Input
              placeholder="Nome do equipamento ou acessório..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>
          <div className="sm:col-span-4">
            <Select value={newCat} onValueChange={(v) => setNewCat(v as CallSheetGearItem["category"])}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GEAR_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="h-8 w-full text-xs"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
