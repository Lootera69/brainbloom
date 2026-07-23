"use client";

import { useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-lg text-xs transition-all",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const initializedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write something...",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html === "<p></p>") {
        onChange("");
      } else {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60px] px-3 py-2 text-xs text-foreground [&_p]:leading-relaxed [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:text-xs",
      },
    },
  });

  if (editor && !initializedRef.current) {
    initializedRef.current = true;
    if (value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/50 bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10", className)}>
      <div className="flex items-center gap-0.5 border-b border-border/30 px-2 py-1.5">
        <ToolbarButton active={editor?.isActive("bold") ?? false} onClick={toggleBold}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("italic") ?? false} onClick={toggleItalic}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border/40" />
        <ToolbarButton active={editor?.isActive("bulletList") ?? false} onClick={toggleBulletList}>
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("orderedList") ?? false} onClick={toggleOrderedList}>
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
