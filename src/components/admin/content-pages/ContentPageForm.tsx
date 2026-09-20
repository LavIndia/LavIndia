"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionFields } from "@/components/admin/content-pages/SectionFields";
import {
  emptyDraft,
  toDrafts,
  toSections,
  type SectionDraft,
} from "@/components/admin/content-pages/content-text";
import {
  cardStyle,
  fieldGridStyle,
  fieldStyle,
  formStyle,
  hintStyle,
  issueListStyle,
  publishRowStyle,
  toolbarStyle,
} from "@/components/admin/content-pages/content-pages.styles";
import type { ContentPageCopy } from "@/modules/marketing";
import { css } from "styled-system/css";

export interface ContentPageFormProps {
  slug: string;
  href: string;
  initial: ContentPageCopy & { isPublished: boolean };
}

const iconStyle = css({ width: "4", height: "4", marginRight: "2" });
const titleStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "bold",
  color: "fg.default",
});

export function ContentPageForm({ slug, href, initial }: ContentPageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro ?? "");
  const [lastUpdated, setLastUpdated] = useState(initial.lastUpdated ?? "");
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [sections, setSections] = useState<SectionDraft[]>(() =>
    initial.sections.length ? toDrafts(initial.sections) : [emptyDraft()],
  );
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const patchSection = (id: string, patch: Partial<SectionDraft>) =>
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    );

  const moveSection = (id: string, direction: -1 | 1) =>
    setSections((current) => {
      const index = current.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const removeSection = (id: string) =>
    setSections((current) =>
      current.length === 1 ? current : current.filter((section) => section.id !== id),
    );

  const save = async () => {
    setSaving(true);
    setIssues([]);
    try {
      const response = await fetch(`/api/admin/content-pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          intro,
          lastUpdated,
          isPublished,
          sections: toSections(sections),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setIssues(data.issues ?? []);
        toast.error(data.error ?? "Failed to save the page");
        return;
      }

      toast.success("Page saved. It is live on the site now.");
      router.refresh();
    } catch {
      toast.error("Failed to save the page");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={formStyle}>
      <div className={toolbarStyle}>
        <div>
          <Link href="/admin/content-pages">
            <Button variant="ghost" size="sm">
              <ArrowLeft className={iconStyle} />
              All pages
            </Button>
          </Link>
          <h1 className={titleStyle}>{title || slug}</h1>
          <p className={hintStyle}>Published at {href}</p>
        </div>
        <div className={css({ display: "flex", gap: "2" })}>
          <Link href={href} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ExternalLink className={iconStyle} />
              View page
            </Button>
          </Link>
          <Button onPress={save} isDisabled={saving}>
            {saving ? (
              <Loader2 className={css({ width: "4", height: "4", marginRight: "2", animation: "spin" })} />
            ) : (
              <Save className={iconStyle} />
            )}
            Save changes
          </Button>
        </div>
      </div>

      <div className={cardStyle}>
        <div className={fieldGridStyle}>
          <div className={fieldStyle}>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="lastUpdated">Last updated</Label>
            <Input
              id="lastUpdated"
              value={lastUpdated}
              placeholder="20 September 2026"
              onChange={(e) => setLastUpdated(e.target.value)}
            />
            <p className={hintStyle}>
              Shown as &ldquo;Last updated &hellip;&rdquo;. Leave empty to hide it —
              policies should carry one, other pages usually should not.
            </p>
          </div>
        </div>

        <div className={css({ marginTop: "4" })}>
          <div className={fieldStyle}>
            <Label htmlFor="intro">Intro</Label>
            <Input
              id="intro"
              value={intro}
              placeholder="One sentence under the title"
              onChange={(e) => setIntro(e.target.value)}
            />
            <p className={hintStyle}>Leave empty to hide the line entirely.</p>
          </div>
        </div>

        <div className={css({ marginTop: "5" })}>
          <div className={publishRowStyle}>
            <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
            <Label htmlFor="isPublished">Use my version on the site</Label>
          </div>
          <p className={hintStyle}>
            Turn this off to fall back to the draft the site ships with. Your
            edits are kept either way.
          </p>
        </div>

        {issues.length > 0 ? (
          <ul className={issueListStyle}>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {sections.map((draft, index) => (
        <SectionFields
          key={draft.id}
          draft={draft}
          index={index}
          total={sections.length}
          onChange={patchSection}
          onMove={moveSection}
          onRemove={removeSection}
        />
      ))}

      <div>
        <Button
          variant="outline"
          onPress={() => setSections((current) => [...current, emptyDraft()])}
        >
          <Plus className={iconStyle} />
          Add section
        </Button>
      </div>
    </div>
  );
}
