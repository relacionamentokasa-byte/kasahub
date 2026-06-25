import { Search, Loader2, Users, Briefcase, Handshake, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Result = {
  id: string;
  kind: "cliente" | "job" | "parceiro" | "proposta";
  label: string;
  sub?: string | null;
  to: string;
  params?: Record<string, string>;
};

const KIND_META: Record<Result["kind"], { icon: typeof Users; tag: string }> = {
  cliente: { icon: Users, tag: "Cliente" },
  job: { icon: Briefcase, tag: "Tarefa" },
  parceiro: { icon: Handshake, tag: "Parceiro" },
  proposta: { icon: FileText, tag: "Proposta" },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 180);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async (): Promise<Result[]> => {
      const q = debounced;
      const like = `%${q}%`;
      const [clients, jobs, partners, proposals] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, company")
          .or(`name.ilike.${like},company.ilike.${like}`)
          .limit(5),
        supabase
          .from("jobs")
          .select("id, title, client_id")
          .ilike("title", like)
          .limit(5),
        (supabase as any)
          .from("partners")
          .select("id, name, specialty")
          .or(`name.ilike.${like},specialty.ilike.${like}`)
          .limit(5),
        supabase
          .from("proposals")
          .select("id, title, client_name")
          .or(`title.ilike.${like},client_name.ilike.${like}`)
          .limit(5),
      ]);

      const out: Result[] = [];
      (clients.data ?? []).forEach((c: any) =>
        out.push({
          id: c.id,
          kind: "cliente",
          label: c.company || c.name,
          sub: c.company ? c.name : null,
          to: "/clientes/$clientId",
          params: { clientId: c.id },
        }),
      );
      (jobs.data ?? []).forEach((j: any) =>
        out.push({ id: j.id, kind: "job", label: j.title, to: "/jobs" }),
      );
      (partners.data ?? []).forEach((p: any) =>
        out.push({
          id: p.id,
          kind: "parceiro",
          label: p.name,
          sub: p.specialty,
          to: "/parceiros",
        }),
      );
      (proposals.data ?? []).forEach((p: any) =>
        out.push({
          id: p.id,
          kind: "proposta",
          label: p.title || p.client_name,
          sub: p.title ? p.client_name : null,
          to: "/propostas/$proposalId",
          params: { proposalId: p.id },
        }),
      );
      return out;
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    setActive(0);
  }, [debounced, results.length]);

  const go = (r: Result) => {
    setOpen(false);
    setTerm("");
    navigate({ to: r.to as any, params: r.params as any });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && debounced.length >= 2;

  return (
    <div
      ref={wrapperRef}
      className="hidden lg:flex relative items-center gap-3 bg-surface/60 border border-border px-4 h-9 rounded-full w-full max-w-md"
    >
      <Search className="size-4 text-foreground/40 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Busca global — clientes, tarefas, parceiros, propostas…"
        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-foreground/40"
      />
      {isFetching && debounced.length >= 2 ? (
        <Loader2 className="size-3.5 text-foreground/40 animate-spin shrink-0" />
      ) : (
        <kbd className="text-[10px] font-mono-kasa text-foreground/30 border border-border rounded px-1.5 py-0.5 shrink-0">
          {typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
        </kbd>
      )}

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50">
          {results.length === 0 && !isFetching ? (
            <div className="px-4 py-6 text-xs text-foreground/50 text-center">
              Nada encontrado para “{debounced}”.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => {
                const Meta = KIND_META[r.kind];
                const Icon = Meta.icon;
                return (
                  <li key={`${r.kind}-${r.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                      }`}
                    >
                      <Icon className="size-4 text-foreground/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{r.label}</p>
                        {r.sub ? (
                          <p className="text-[11px] text-foreground/50 truncate">{r.sub}</p>
                        ) : null}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-foreground/40 shrink-0">
                        {Meta.tag}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
