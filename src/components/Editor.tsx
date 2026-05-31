'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { 
  Bold, Italic, Code, Heading1, Heading2, Quote, 
  List, ListOrdered, Undo, Redo 
} from 'lucide-react'

interface EditorProps {
  initialContentJsonStr: string
  onChange: (jsonStr: string) => void
}

export default function Editor({ initialContentJsonStr, onChange }: EditorProps) {
  let parsedContent = {}
  try {
    parsedContent = initialContentJsonStr ? JSON.parse(initialContentJsonStr) : { type: 'doc', content: [] }
  } catch (e) {
    parsedContent = { type: 'doc', content: [] }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
    ],
    content: parsedContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange(JSON.stringify(json))
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[400px] max-h-[600px] overflow-y-auto px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 text-sm text-neutral-200 placeholder-neutral-500 prose prose-invert max-w-none',
      },
    },
  })

  if (!editor) return null

  const MenuButton = ({ 
    onClick, 
    active, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    children: React.ReactNode; 
    title: string 
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg border transition-all cursor-pointer ${
        active 
          ? 'bg-violet-600/20 border-violet-500/30 text-violet-400' 
          : 'bg-white/[0.02] border-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.05]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1.5 p-2 bg-[#0c0b12] border border-white/[0.08] rounded-xl">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </MenuButton>

        <div className="w-[1px] bg-white/[0.08] mx-1 self-stretch" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>

        <div className="w-[1px] bg-white/[0.08] mx-1 self-stretch" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </MenuButton>

        <div className="w-[1px] bg-white/[0.08] mx-1 self-stretch" />

        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  )
}
