"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { css } from "styled-system/css";

/** The same rule the server applies: "Festive Edit" → "festive-edit". */
export function normaliseTagText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export const tagText = (tag: string) => tag.replace(/-/g, " ");

const chipRow = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const chip = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  borderRadius: "full",
  background: "gold.50",
  border: "1px solid",
  borderColor: "gold.200",
  paddingInline: "2.5",
  paddingBlock: "0.5",
  fontSize: "sm",
  _dark: { background: "bg.canvas", borderColor: "gold.700" },
});
const suggestion = css({
  borderRadius: "full",
  border: "1px dashed",
  borderColor: "border.subtle",
  paddingInline: "2.5",
  paddingBlock: "0.5",
  fontSize: "sm",
  color: "fg.muted",
  cursor: "pointer",
  background: "transparent",
  _hover: { color: "fg.default", borderColor: "accent.default" },
});

/** Every tag already in use, so the admin picks before typing. */
export function useExistingTags() {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/products/tags")
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((body) => alive && setTags(body.tags ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return tags;
}

/**
 * Tags as chips: pick one already in use, or type a new one and press
 * Enter. Offers reach pieces by tag through Piece Sets.
 */
export function TagInput({
  id,
  value,
  onChange,
  placeholder = "Add a tag, e.g. festive edit",
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const existing = useExistingTags();
  const add = (raw: string) => {
    const tag = normaliseTagText(raw);
    if (tag && !value.includes(tag)) onChange([...value, tag].sort());
    setText("");
  };
  const unused = existing.filter((t) => !value.includes(t));
  const typed = normaliseTagText(text);
  const shown = typed ? unused.filter((t) => t.includes(typed)) : unused;

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
      {value.length > 0 && (
        <div className={chipRow}>
          {value.map((tag) => (
            <span key={tag} className={chip}>
              {tagText(tag)}
              <button
                type="button"
                aria-label={`Remove tag ${tagText(tag)}`}
                className={css({ cursor: "pointer", display: "inline-flex" })}
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                <X className={css({ width: "3.5", height: "3.5" })} />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          }
        }}
        onBlur={() => text.trim() && add(text)}
      />
      {shown.length > 0 && (
        <div className={chipRow}>
          {shown.slice(0, 12).map((tag) => (
            <button key={tag} type="button" className={suggestion} onClick={() => add(tag)}>
              + {tagText(tag)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
