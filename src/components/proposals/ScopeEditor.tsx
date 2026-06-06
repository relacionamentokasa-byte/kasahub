import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  List,
  Heading2,
  FileText,
  Save,
  Eye,
  Pencil,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createScopeTemplate,
  fetchScopeTemplates,
} from "@/lib/scope-templates-api";
import { toast } from "sonner";
import { ScopeRenderer } from "./ScopeRenderer";

export function ScopeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState("");
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["scope-templates"],
    queryFn: fetchScopeTemplates,
  });

  const saveTplMut = useMutation({
    mutationFn: () =>
      createScopeTemplate({
        name: tplName,
        category: tplCategory || null,
        content: value,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scope-templates"] });
      toast.success("Modelo salvo");
      setSaveOpen(false);
      setTplName("");
      setTplCategory("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function wrap(prefix: string, suffix = prefix) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = value.slice(start, end) || "texto";
    const next = value.slice(0, start) + prefix + sel + suffix + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + sel.length);
    });
  }

  function prefixLines(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const before = value.slice(0, start);
    const sel = value.slice(start, end) || "Item";
    const after = value.slice(end);
    const transformed = sel
      .split("\n")
      .map((l) => (l ? `${prefix}${l}` : l))
      .join("\n");
    onChange(before + transformed + after);
  }

  function insertTemplate(content: string, replace: boolean) {
    onChange(replace || !value.trim() ? content : `${value}\n\n${content}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" type="button" onClick={() => wrap("**")}>
          <Bold className="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => wrap("*")}>
          <Italic className="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => prefixLines("## ")}>
          <Heading2 className="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => prefixLines("- ")}>
          <List className="size-3.5" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" type="button">
              <FileText className="size-3.5" /> Carregar Modelo
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2">
            <div className="max-h-72 overflow-y-auto space-y-1">
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">
                  Nenhum modelo cadastrado. Crie um em Configurações.
                </p>
              )}
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-1 p-1.5 rounded hover:bg-muted">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    {t.category && (
                      <p className="text-[10px] text-muted-foreground">{t.category}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => insertTemplate(t.content, false)}
                    title="Adicionar ao final"
                  >
                    +
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => insertTemplate(t.content, true)}
                    title="Substituir conteúdo"
                  >
                    ⟳
                  </Button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => setSaveOpen(true)}
          disabled={!value.trim()}
        >
          <Save className="size-3.5" /> Salvar como Modelo
        </Button>
        <div className="ml-auto inline-flex rounded-md border border-border p-0.5">
          <Button
            size="sm"
            variant={tab === "edit" ? "secondary" : "ghost"}
            type="button"
            onClick={() => setTab("edit")}
          >
            <Pencil className="size-3.5" /> Editar
          </Button>
          <Button
            size="sm"
            variant={tab === "preview" ? "secondary" : "ghost"}
            type="button"
            onClick={() => setTab("preview")}
          >
            <Eye className="size-3.5" /> Pré-visualizar
          </Button>
        </div>
      </div>

      {tab === "edit" ? (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="font-mono text-sm min-h-[280px]"
          placeholder={`Escreva o escopo dos serviços. Suporta Markdown:\n\n## Título\n\nParágrafo livre.\n\n- Item de lista\n- Outro item\n\n**Negrito** e *itálico*`}
        />
      ) : (
        <div className="min-h-[280px] rounded-md border border-border bg-background p-4">
          {value.trim() ? (
            <ScopeRenderer text={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nada para pré-visualizar.</p>
          )}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Ex: Gestão de Tráfego"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria (opcional)</label>
              <Input
                value={tplCategory}
                onChange={(e) => setTplCategory(e.target.value)}
                placeholder="Ex: Tráfego, Conteúdo, Branding"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} type="button">
              Cancelar
            </Button>
            <Button
              onClick={() => saveTplMut.mutate()}
              disabled={!tplName.trim() || saveTplMut.isPending}
              type="button"
            >
              {saveTplMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
