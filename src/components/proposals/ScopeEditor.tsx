import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Type,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'p';
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 mb-1 border-b bg-muted/50 rounded-t-xl">
      <Select
        value={getCurrentHeading()}
        onValueChange={(value) => {
          if (value === 'p') {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(value.replace('h', '')) as any;
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
      >
        <SelectTrigger className="h-8 w-[140px] border-none bg-transparent hover:bg-muted focus:ring-0">
          <SelectValue placeholder="Tamanho" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">
            <div className="flex items-center gap-2">
              <Type className="size-4" />
              <span>Texto Normal</span>
            </div>
          </SelectItem>
          <SelectItem value="h1">
            <div className="flex items-center gap-2">
              <Heading1 className="size-4" />
              <span>Título 1</span>
            </div>
          </SelectItem>
          <SelectItem value="h2">
            <div className="flex items-center gap-2">
              <Heading2 className="size-4" />
              <span>Título 2</span>
            </div>
          </SelectItem>
          <SelectItem value="h3">
            <div className="flex items-center gap-2">
              <Heading3 className="size-4" />
              <span>Título 3</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrito"
      >
        <Bold className="size-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Itálico"
      >
        <Italic className="size-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Sublinhado"
      >
        <UnderlineIcon className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Lista com marcadores"
      >
        <List className="size-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Lista numerada"
      >
        <ListOrdered className="size-4" />
      </Toggle>
    </div>
  );
};

export function ScopeEditor({
  value,
  onChange,
}: {
  value: string | string[];
  onChange: (v: string) => void;
}) {
  // Convert old array/text format to initial HTML
  const getInitialContent = () => {
    if (!value) return '';
    if (Array.isArray(value)) {
      return value.map(item => `<p>${item}</p>`).join('');
    }
    // If it doesn't look like HTML, wrap in paragraphs
    if (value && !value.includes('<')) {
      return value.split('\n').filter(Boolean).map(line => `<p>${line}</p>`).join('');
    }
    return value;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Heading.configure({
        levels: [1, 2, 3],
      }),
    ],
    content: getInitialContent(),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[300px] p-4 max-w-none',
      },
    },
  });

  // Update editor content if value changes externally (and it's not the same content)
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentContent = editor.getHTML();
      const newContent = getInitialContent();
      
      // Only set content if it's different to avoid cursor jumping
      // Basic check: remove spaces and compare
      if (currentContent.replace(/\s/g, '') !== newContent.replace(/\s/g, '')) {
        editor.commands.setContent(newContent);
      }
    }
  }, [value, editor]);

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="p-2 border-t bg-muted/20">
        <p className="text-[10px] text-muted-foreground italic px-1">
          Editor de texto rico habilitado. Use a barra de ferramentas para formatar seu escopo.
        </p>
      </div>
    </div>
  );
}
