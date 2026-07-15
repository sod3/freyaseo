"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageUrlField } from "./ImageUrlField";

type TextItem = {
  id: string;
  tag: string;
  label: string;
  text: string;
  originalText: string;
  href: string;
  originalHref: string;
  outerHtml: string;
};

type ImageItem = {
  id: string;
  label: string;
  src: string;
  originalSrc: string;
  alt: string;
  originalAlt: string;
  outerHtml: string;
};

type EditorPayload = {
  texts: Array<Pick<TextItem, "tag" | "text" | "originalText" | "href" | "originalHref" | "outerHtml">>;
  images: Array<Pick<ImageItem, "src" | "originalSrc" | "alt" | "originalAlt" | "outerHtml">>;
};

const textSelector = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "a",
  "button",
  ".elementor-button-text",
  ".elementor-heading-title",
  ".ekit-heading__title",
].join(",");

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function elementLabel(element: Element, index: number) {
  const tag = element.tagName.toUpperCase();
  const text = cleanText(element.textContent || "");
  const preview = text.length > 42 ? `${text.slice(0, 42)}...` : text;
  return `${tag} ${index + 1}${preview ? ` - ${preview}` : ""}`;
}

function parseHtml(html: string) {
  if (!html.trim()) return { texts: [] as TextItem[], images: [] as ImageItem[] };

  const document = new DOMParser().parseFromString(html, "text/html");
  const textNodes = Array.from(document.body.querySelectorAll<HTMLElement>(textSelector))
    .filter((element) => {
      if (element.closest("script, style, noscript, svg")) return false;
      const text = cleanText(element.textContent || "");
      if (text.length < 2 || text.length > 900) return false;
      return Boolean(element.outerHTML);
    })
    .slice(0, 220)
    .map((element, index) => ({
      id: `text-${index}`,
      tag: element.tagName.toLowerCase(),
      label: elementLabel(element, index),
      text: cleanText(element.textContent || ""),
      originalText: cleanText(element.textContent || ""),
      href: element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "",
      originalHref: element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "",
      outerHtml: element.outerHTML,
    }));

  const images = Array.from(document.body.querySelectorAll<HTMLImageElement>("img[src]"))
    .filter((image) => Boolean(image.outerHTML))
    .slice(0, 80)
    .map((image, index) => ({
      id: `image-${index}`,
      label: `Image ${index + 1}`,
      src: image.getAttribute("src") || "",
      originalSrc: image.getAttribute("src") || "",
      alt: image.getAttribute("alt") || "",
      originalAlt: image.getAttribute("alt") || "",
      outerHtml: image.outerHTML,
    }));

  return { texts: textNodes, images };
}

export function PageContentEditor({ html }: { html: string }) {
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);

  useEffect(() => {
    const parsed = parseHtml(html);
    // This parser depends on DOMParser, so it intentionally runs after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexts(parsed.texts);
    setImages(parsed.images);
  }, [html]);

  const payload = useMemo<EditorPayload>(
    () => ({
      texts: texts
        .filter((item) => item.text !== item.originalText || item.href !== item.originalHref)
        .map(({ tag, text, originalText, href, originalHref, outerHtml }) => ({ tag, text, originalText, href, originalHref, outerHtml })),
      images: images
        .filter((item) => item.src !== item.originalSrc || item.alt !== item.originalAlt)
        .map(({ src, originalSrc, alt, originalAlt, outerHtml }) => ({ src, originalSrc, alt, originalAlt, outerHtml })),
    }),
    [texts, images],
  );

  const updateText = (id: string, field: "text" | "href", value: string) => {
    setTexts((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const updateImage = (id: string, field: "src" | "alt", value: string) => {
    setImages((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <section className="admin-editor-workspace">
      <input type="hidden" name="contentEditsJson" value={JSON.stringify(payload)} readOnly />
      <div className="admin-editor-toolbar">
        <strong>Visual content editor</strong>
        <span className="admin-muted">
          {texts.length} text blocks, {images.length} images
        </span>
      </div>

      <div className="admin-editor-columns">
        <div className="admin-editor-column">
          <h3>Text</h3>
          {texts.length ? (
            texts.map((item, index) => (
              <details className="admin-editor-card" key={item.id} open={index < 8}>
                <summary>{item.label}</summary>
                <label className="admin-field">
                  <span>Edit text</span>
                  <textarea className="admin-textarea" value={item.text} onChange={(event) => updateText(item.id, "text", event.target.value)} />
                </label>
                {item.tag === "a" ? (
                  <label className="admin-field">
                    <span>Link target</span>
                    <input
                      className="admin-input"
                      value={item.href}
                      onChange={(event) => updateText(item.id, "href", event.target.value)}
                      placeholder="/target-page/"
                    />
                  </label>
                ) : null}
              </details>
            ))
          ) : (
            <p className="admin-muted">No editable text blocks were found in this page HTML.</p>
          )}
        </div>

        <div className="admin-editor-column">
          <h3>Images</h3>
          {images.length ? (
            images.map((item) => (
              <div className="admin-editor-card" key={item.id}>
                <ImageUrlField label={item.label} value={item.src} altText={item.alt} onChange={(nextValue) => updateImage(item.id, "src", nextValue)} />
                <label className="admin-field">
                  <span>Alt text</span>
                  <input className="admin-input" value={item.alt} onChange={(event) => updateImage(item.id, "alt", event.target.value)} />
                </label>
              </div>
            ))
          ) : (
            <p className="admin-muted">No editable images were found in this page HTML.</p>
          )}
        </div>
      </div>
    </section>
  );
}
