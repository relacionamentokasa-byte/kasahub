import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";

export function ScopeEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    onChange([...items, ""]);
  };

  const removeItem = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    onChange(next);
  };

  const updateItem = (index: number, text: string) => {
    const next = [...items];
    next[index] = text;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <div className="text-muted-foreground/30 cursor-default">
              <GripVertical className="size-4" />
            </div>
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`Item ${index + 1}...`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">Nenhum item adicionado ao escopo.</p>
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full border-dashed"
      >
        <Plus className="size-4 mr-2" />
        Adicionar item
      </Button>
    </div>
  );
}
