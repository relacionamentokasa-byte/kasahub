import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { fetchClients, type Client } from "@/lib/ops-api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

function displayName(c: Client) {
  return (c as any).company || c.name || "Cliente sem nome";
}

function initials(s: string) {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

interface ClientPickerProps {
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

export function ClientPicker({
  value, onChange, placeholder = "Selecionar cliente",
  className, allowClear = false,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const sorted = useMemo(
    () => [...clients].sort((a, b) =>
      displayName(a).localeCompare(displayName(b), "pt-BR", { sensitivity: "base" })
    ),
    [clients],
  );

  const selected = sorted.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 px-3 gap-3 bg-background/60 border-border/60 hover:border-primary/50 hover:bg-background transition-all justify-start min-w-[240px] rounded-xl",
            className,
          )}
        >
          {selected ? (
            <>
              <Avatar className="size-7 ring-1 ring-border">
                <AvatarImage src={(selected as any).logo_url ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                  {initials(displayName(selected))}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs text-foreground/40 leading-tight font-mono-kasa uppercase">Cliente</p>
                <p className="text-sm font-medium truncate leading-tight">{displayName(selected)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="size-7 rounded-full bg-muted/60 grid place-items-center">
                <Search className="size-3.5 text-foreground/50" />
              </div>
              <span className="flex-1 text-left text-sm text-foreground/50">{placeholder}</span>
            </>
          )}
          {allowClear && selected ? (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="size-5 grid place-items-center rounded-md hover:bg-muted transition-colors"
              aria-label="Limpar"
            >
              <X className="size-3.5 text-foreground/50" />
            </button>
          ) : (
            <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[360px] bg-surface border-border rounded-xl shadow-2xl" align="start">
        <Command>
          <div className="flex items-center border-b border-border px-3">
            <Search className="size-4 text-foreground/40 mr-2 shrink-0" />
            <CommandInput
              placeholder="Buscar cliente..."
              className="h-11 border-0 focus:ring-0 placeholder:text-foreground/40"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono-kasa text-[10px] text-foreground/40">
              {sorted.length}
            </kbd>
          </div>
          <CommandList className="max-h-[380px]">
            <CommandEmpty className="py-8 text-center text-sm text-foreground/50">
              Nenhum cliente encontrado.
            </CommandEmpty>
            <CommandGroup>
              {sorted.map((c) => {
                const name = displayName(c);
                const contact = (c as any).company ? c.name : null;
                return (
                  <CommandItem
                    key={c.id}
                    value={`${name} ${contact ?? ""}`}
                    onSelect={() => { onChange(c.id); setOpen(false); }}
                    className="flex items-center gap-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-primary/10 aria-selected:text-foreground"
                  >
                    <Avatar className="size-8 ring-1 ring-border">
                      <AvatarImage src={(c as any).logo_url ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{name}</p>
                      {contact && (
                        <p className="text-[11px] text-foreground/40 truncate leading-tight mt-0.5">{contact}</p>
                      )}
                    </div>
                    {value === c.id && <Check className="size-4 text-primary shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
