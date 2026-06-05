import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Plus } from "lucide-react";
import { fetchServices, type Service } from "@/lib/services-api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function ServicesMultiSelect({
  value,
  onChange,
  placeholder = "Selecionar serviços",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
  });

  const selected = services.filter((s) => value.includes(s.id));

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between font-normal h-auto min-h-9 py-1.5", className)}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((s) => (
                <Badge key={s.id} variant="secondary" className="font-normal">
                  {s.name}
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        {services.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum serviço cadastrado.
            <br />
            Configurações → Serviços e Templates.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {services.map((s: Service) => {
              const active = value.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                >
                  <div
                    className={cn(
                      "size-4 rounded border flex items-center justify-center",
                      active ? "bg-primary border-primary" : "border-input",
                    )}
                  >
                    {active && <Check className="size-3 text-primary-foreground" />}
                  </div>
                  <span className="flex-1">{s.name}</span>
                  {s.category && (
                    <span className="text-[10px] text-muted-foreground font-mono-kasa capitalize">
                      {s.category}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
