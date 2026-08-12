"use client";

import { Trash2 } from "lucide-react";

export function AdminDeleteButton({ recordTitle }: { recordTitle: string }) {
  return (
    <button
      className="admin-button admin-button-danger"
      type="submit"
      onClick={(event) => {
        if (!window.confirm(`Delete “${recordTitle}”? It will be removed from the public website.`)) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 size={17} aria-hidden />
      Delete
    </button>
  );
}
