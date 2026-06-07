import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from "react";
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
  Pencil,
  Loader2,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  ListOrdered,
  Quote,
  Heading3,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createScopeTemplate,
  fetchScopeTemplates,
} from "@/lib/scope-templates-api";
import { toast } from "sonner";
import Showdown from 'showdown';
import TurndownService from 'turndown';

const converter = new Showdown.Converter({
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true,
  tasklists: true,
});

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
});

export function ScopeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState("");
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["scope-templates"],
    queryFn: fetchScopeTemplates,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Descreva o escopo dos serviços...',
      }),
    ],
    content: converter.makeHtml(value),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  // Sync external changes (like loading template) back to editor
  useEffect(() => {
    if (editor && value !== turndownService.turndown(editor.getHTML())) {
      editor.commands.setContent(converter.makeHtml(value));
    }
  }, [value, editor]);

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

  function insertTemplate(content: string, replace: boolean) {
    const nextMarkdown = replace || !value.trim() ? content : `${value}\n\n${content}`;
    onChange(nextMarkdown);
    if (editor) {
      editor.commands.setContent(converter.makeHtml(nextMarkdown));
    }
  }

  if (!editor) return null;

  return (
    <div className="space-y-2 border border-border rounded-md bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 border-b border-border">
        <Button 
          size="sm" 
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
        >
          <Bold className="size-3.5" />
        </Button>
        <Button 
          size="sm" 
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
        >
          <Italic className="size-3.5" />
        </Button>
        <Button 
          size="sm" 
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="h-8 w-8 p-0"
        >
          <UnderlineIcon className="size-3.5" />
        </Button>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <Button 
          size="sm" 
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="size-3.5" />
        </Button>
        <Button 
          size="sm" 
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading3 className="size-3.5" />
        </Button>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <Button 
          size="sm" 
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
        >
          <List className="size-3.5" />
        </Button>
        <Button 
          size="sm" 
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="size-3.5" />
        </Button>
        <Button 
          size="sm" 
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} 
          type="button" 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className="h-8 w-8 p-0"
        >
          <Quote className="size-3.5" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" type="button" className="h-8 text-[10px] uppercase font-bold tracking-tight px-2">
              <FileText className="size-3 mr-1" /> Modelos
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2">
            <div className="max-h-72 overflow-y-auto space-y-1">
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">
                  Nenhum modelo cadastrado.
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
          variant="ghost"
          type="button"
          onClick={() => setSaveOpen(true)}
          disabled={!value.trim()}
          className="h-8 text-[10px] uppercase font-bold tracking-tight px-2"
        >
          <Save className="size-3 mr-1" /> Salvar Modelo
        </Button>
      </div>

      <div className="bg-background min-h-[300px] cursor-text" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>

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
