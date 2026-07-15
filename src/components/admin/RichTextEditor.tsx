"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";

type RichTextEditorProps = {
  name: string;
  defaultValue?: string;
};

export function RichTextEditor({ name, defaultValue = "" }: RichTextEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: defaultValue,
    onUpdate: ({ editor: currentEditor }) => {
      setValue(currentEditor.getHTML());
    },
  });

  return (
    <div className="admin-rich-editor">
      <input type="hidden" name={name} value={value} readOnly />
      <div className="admin-actions" aria-label="Rich text controls">
        <button className="admin-button admin-button-secondary" type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>
          B
        </button>
        <button className="admin-button admin-button-secondary" type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button className="admin-button admin-button-secondary" type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          List
        </button>
        <button className="admin-button admin-button-secondary" type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
