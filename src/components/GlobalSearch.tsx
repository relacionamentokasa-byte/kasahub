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
        out.push({
          id: j.id,
          kind: "job",
          label: j.title,
          to: "/jobs",
          params: { jobId: j.id },
        }),
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
    if (r.kind === "job") {
      navigate({ to: "/jobs", search: { jobId: r.id } as any });
    } else if (r.params) {
      navigate({ to: r.to as any, params: r.params as any });
    } else {
      navigate({ to: r.to as any });
    }
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
      className="flex relative items-center gap-2.5 bg-white/10 hover:bg-white/15 focus-within:bg-[#18181b] focus-within:ring-1 focus-within:ring-amber-400/60 border border-white/15 px-3 h-8 rounded-lg w-full transition-all text-white"
    >
      <Search className="size-3.5 text-zinc-400 shrink-0" />
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
        placeholder="Buscar clientes, jobs, propostas..."
        className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-zinc-400"
      />
      {isFetching && debounced.length >= 2 ? (
        <Loader2 className="size-3.5 text-amber-400 animate-spin shrink-0" />
      ) : (
        <kbd className="text-[9px] font-mono-kasa text-zinc-400 border border-white/15 bg-white/5 rounded px-1 py-0.5 shrink-0 select-none">
          {typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
        </kbd>
      )}

      {showDropdown ? (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-[calc(100%+6px)] min-w-[340px] bg-[#121214] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-white"
        >
          {results.length === 0 && !isFetching ? (
            <div className="px-4 py-6 text-xs text-zinc-400 text-center font-mono-kasa">
              Nada encontrado para “{debounced}”.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1 divide-y divide-white/10">
              {results.map((r, i) => {
                const Meta = KIND_META[r.kind];
                const Icon = Meta.icon;
                return (
                  <li key={`${r.kind}-${r.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        go(r);
                      }}
                      onClick={() => go(r)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                        i === active ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="size-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Icon className="size-3.5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-white text-xs">{r.label}</p>
                        {r.sub ? (
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{r.sub}</p>
                        ) : null}
                      </div>
                      <span className="text-[9px] font-mono-kasa font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-amber-300 shrink-0">
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
