type Locale = "en" | "el";

type LocalizedString = {
  en?: string;
  el?: string;
};

type CmsSection = {
  discriminant: string;
  value?: Record<string, unknown>;
};

function localized(value: unknown, locale: Locale) {
  if (!value || typeof value !== "object") return "";
  const copy = value as LocalizedString;
  return copy[locale] || copy.en || copy.el || "";
}

function sectionEnabled(value: Record<string, unknown> | undefined) {
  return value?.enabled !== false;
}

function textBlock(value: Record<string, unknown> | undefined, locale: Locale) {
  if (!value) return null;

  return (
    <>
      {localized(value.heading, locale) ? <h2>{localized(value.heading, locale)}</h2> : null}
      {localized(value.content, locale) ? <p>{localized(value.content, locale)}</p> : null}
    </>
  );
}

export function CmsSectionRenderer({ sections, locale }: { sections?: CmsSection[]; locale: Locale }) {
  if (!sections?.length) return null;

  return (
    <main className="cms-page">
      {sections.map((section, index) => {
        const value = section.value;
        if (!sectionEnabled(value)) return null;

        const anchorId = typeof value?.anchorId === "string" ? value.anchorId : undefined;

        if (section.discriminant === "hero") {
          return (
            <section className="cms-section cms-section-hero" id={anchorId} key={`${section.discriminant}-${index}`}>
              {localized(value?.eyebrow, locale) ? <p>{localized(value?.eyebrow, locale)}</p> : null}
              {localized(value?.heading, locale) ? <h1>{localized(value?.heading, locale)}</h1> : null}
              {localized(value?.content, locale) ? <p>{localized(value?.content, locale)}</p> : null}
            </section>
          );
        }

        return (
          <section className={`cms-section cms-section-${section.discriminant}`} id={anchorId} key={`${section.discriminant}-${index}`}>
            {textBlock(value, locale)}
          </section>
        );
      })}
    </main>
  );
}
