import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Link2, Image as ImageIcon,
  List, ListOrdered, Heading1, Heading2, Heading3, AlignLeft, AlignCenter,
  AlignRight, Table as TableIcon, Undo2, Redo2, Minus,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.upload<any>('/media/upload', fd);
      const url = res?.url || res?.data?.url;
      if (url) editor.chain().focus().setImage({ src: url }).run();
    } catch {
      alert('Ошибка загрузки изображения');
    }
  };

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL ссылки:', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`;

  return (
    <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Жирный"><Bold className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Курсив"><Italic className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Подчёркнутый"><UnderlineIcon className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Зачёркнутый"><Strikethrough className="w-4 h-4" /></button>
      <div className="w-px bg-gray-200 mx-0.5 self-stretch" />
      <button type="button" className={btn(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="w-4 h-4" /></button>
      <div className="w-px bg-gray-200 mx-0.5 self-stretch" />
      <button type="button" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Список"><List className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Нумерованный список"><ListOrdered className="w-4 h-4" /></button>
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Разделитель"><Minus className="w-4 h-4" /></button>
      <div className="w-px bg-gray-200 mx-0.5 self-stretch" />
      <button type="button" className={btn(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="По левому краю"><AlignLeft className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="По центру"><AlignCenter className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="По правому краю"><AlignRight className="w-4 h-4" /></button>
      <div className="w-px bg-gray-200 mx-0.5 self-stretch" />
      <button type="button" className={btn(editor.isActive('link'))} onClick={setLink} title="Ссылка"><Link2 className="w-4 h-4" /></button>
      <button type="button" className={btn(false)} onClick={() => fileRef.current?.click()} title="Вставить изображение"><ImageIcon className="w-4 h-4" /></button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
      <button type="button" className={btn(editor.isActive('table'))} onClick={insertTable} title="Таблица"><TableIcon className="w-4 h-4" /></button>
      <div className="w-px bg-gray-200 mx-0.5 self-stretch" />
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Отмена"><Undo2 className="w-4 h-4" /></button>
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Повтор"><Redo2 className="w-4 h-4" /></button>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder = 'Начните вводить текст...', minHeight = 200 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value && value !== undefined) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        placeholder={placeholder}
        className="bg-white"
      />
      <style>{`
        .ProseMirror table { border-collapse: collapse; width: 100%; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #d1d5db; padding: 6px 10px; min-width: 60px; }
        .ProseMirror th { background: #f9fafb; font-weight: 600; }
        .ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0 0.25em; }
        .ProseMirror h2 { font-size: 1.25em; font-weight: 600; margin: 0.75em 0 0.25em; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.25em; }
        .ProseMirror p { margin: 0.25em 0; }
        .ProseMirror ul { list-style: disc; padding-left: 1.5em; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.5em; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; }
        .ProseMirror hr { border: none; border-top: 2px solid #e5e7eb; margin: 1em 0; }
        .ProseMirror p.is-editor-empty:first-child::before { color: #9ca3af; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
      `}</style>
    </div>
  );
}
