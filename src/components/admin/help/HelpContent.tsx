import Link from "next/link";
import { css } from "styled-system/css";
import type { HelpEntry } from "@/content/admin-help";

const block = css({ display: "flex", flexDirection: "column", gap: "3" });
const heading = css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.08em", textTransform: "uppercase", color: "fg.muted" });
const body = css({ fontSize: "sm", lineHeight: "relaxed", color: "fg.default" });
const term = css({ fontWeight: "semibold", color: "fg.default" });
const list = css({ display: "flex", flexDirection: "column", gap: "2", paddingLeft: "5", listStyle: "decimal" });
const notes = css({ display: "flex", flexDirection: "column", gap: "2", paddingLeft: "5", listStyle: "disc" });

/** One screen's help, laid out for reading. Used by the panel and the Help page. */
export function HelpContent({ entry }: { entry: HelpEntry }) {
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "fg.default" })}>{entry.purpose}</p>

      {entry.steps && entry.steps.length > 0 && (
        <section className={block}>
          <h3 className={heading}>How to use it</h3>
          <ol className={list}>
            {entry.steps.map((step) => (
              <li key={step} className={body}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {entry.sections?.map((section) => (
        <section key={section.heading} className={block}>
          <h3 className={heading}>{section.heading}</h3>
          <dl className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
            {section.items.map((item) => (
              <div key={item.term} className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                <dt className={term}>{item.term}</dt>
                <dd className={css({ fontSize: "sm", lineHeight: "relaxed", color: "fg.muted", marginLeft: 0 })}>{item.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {entry.notes && entry.notes.length > 0 && (
        <section className={block}>
          <h3 className={heading}>Good to know</h3>
          <ul className={notes}>
            {entry.notes.map((note) => (
              <li key={note} className={body}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {entry.related && entry.related.length > 0 && (
        <section className={block}>
          <h3 className={heading}>Related</h3>
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "3" })}>
            {entry.related.map((r) => (
              <Link key={r.href} href={r.href} className={css({ fontSize: "sm", color: "gold.700", textDecoration: "underline", _dark: { color: "gold.200" } })}>
                {r.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
