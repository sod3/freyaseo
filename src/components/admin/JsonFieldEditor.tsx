"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ImageUrlField } from "./ImageUrlField";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonPath = Array<string | number>;

function humanizeKey(key: string | number) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function parseJson(value: string): JsonValue {
  try {
    const parsed = JSON.parse(value) as JsonValue;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function blankLike(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, blankLike(nested)]));
  }
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return true;
  return "";
}

function setAtPath(value: JsonValue, path: JsonPath, nextLeaf: JsonValue): JsonValue {
  if (!path.length) return nextLeaf;
  const [head, ...tail] = path;

  if (Array.isArray(value)) {
    const copy = [...value];
    copy[Number(head)] = setAtPath(copy[Number(head)] ?? "", tail, nextLeaf);
    return copy;
  }

  if (value && typeof value === "object") {
    return {
      ...value,
      [head]: setAtPath(value[String(head)] ?? "", tail, nextLeaf),
    };
  }

  return value;
}

function removeAtPath(value: JsonValue, path: JsonPath): JsonValue {
  const parentPath = path.slice(0, -1);
  const index = Number(path[path.length - 1]);
  const parent = getAtPath(value, parentPath);
  if (!Array.isArray(parent)) return value;
  return setAtPath(
    value,
    parentPath,
    parent.filter((_, itemIndex) => itemIndex !== index),
  );
}

function getAtPath(value: JsonValue, path: JsonPath): JsonValue {
  return path.reduce<JsonValue>((current, key) => {
    if (Array.isArray(current)) return current[Number(key)] ?? "";
    if (current && typeof current === "object") return current[String(key)] ?? "";
    return "";
  }, value);
}

function isLongTextKey(key: string | number) {
  return /description|content|message|answer|quote|body|notes|summary/i.test(String(key));
}

function isUrlKey(key: string | number) {
  return /url|href|link|path|image|logo|src/i.test(String(key));
}

function isImageKey(key: string | number) {
  const normalized = String(key).toLowerCase();
  if (/alt|caption|description|label|title/.test(normalized)) return false;
  return /image|logo|src|thumbnail|avatar|photo|icon/.test(normalized);
}

function valueSummary(value: JsonValue, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const object = value as Record<string, JsonValue>;
  const candidates = [object.label, object.title, object.name, object.key, object.href, object.url, object.path];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const localized = candidate as Record<string, JsonValue>;
      if (typeof localized.en === "string" && localized.en.trim()) return localized.en;
      if (typeof localized.el === "string" && localized.el.trim()) return localized.el;
    }
  }
  return fallback;
}

export function JsonFieldEditor({ jsonData }: { jsonData: string }) {
  const initialValue = useMemo(() => parseJson(jsonData), [jsonData]);
  const [value, setValue] = useState<JsonValue>(initialValue);
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value]);

  const update = (path: JsonPath, nextValue: JsonValue) => {
    setValue((current) => setAtPath(current, path, nextValue));
  };

  const addArrayItem = (path: JsonPath) => {
    const current = getAtPath(value, path);
    if (!Array.isArray(current)) return;
    const sample = current[0] ?? "";
    update(path, [...current, blankLike(sample)]);
  };

  const removeArrayItem = (path: JsonPath) => {
    setValue((current) => removeAtPath(current, path));
  };

  const renderValue = (current: JsonValue, path: JsonPath, label: string | number): ReactNode => {
    if (Array.isArray(current)) {
      return (
        <fieldset className="admin-json-group">
          <legend>{humanizeKey(label)}</legend>
          <div className="admin-json-list">
            {current.map((item, index) => (
              <details className="admin-json-array-item" key={`${path.join(".")}-${index}`} open={index === 0 && current.length <= 3}>
                <summary>{valueSummary(item, `${humanizeKey(label)} ${index + 1}`)}</summary>
                {renderValue(item, [...path, index], "Details")}
                <button className="admin-button admin-button-secondary" type="button" onClick={() => removeArrayItem([...path, index])}>
                  Remove
                </button>
              </details>
            ))}
          </div>
          <button className="admin-button admin-button-secondary" type="button" onClick={() => addArrayItem(path)}>
            Add item
          </button>
        </fieldset>
      );
    }

    if (current && typeof current === "object") {
      return (
        <fieldset className="admin-json-group">
          <legend>{humanizeKey(label)}</legend>
          {Object.entries(current).map(([key, nested]) => (
            <div key={[...path, key].join(".")}>{renderValue(nested, [...path, key], key)}</div>
          ))}
        </fieldset>
      );
    }

    if (typeof current === "boolean") {
      return (
        <label className="admin-checkbox">
          <input type="checkbox" checked={current} onChange={(event) => update(path, event.target.checked)} />
          <span>{humanizeKey(label)}</span>
        </label>
      );
    }

    if (typeof current === "number") {
      return (
        <label className="admin-field">
          <span>{humanizeKey(label)}</span>
          <input className="admin-input" type="number" value={current} onChange={(event) => update(path, Number(event.target.value || 0))} />
        </label>
      );
    }

    if ((typeof current === "string" || current === null) && isImageKey(label)) {
      return (
        <ImageUrlField
          label={humanizeKey(label)}
          value={String(current || "")}
          onChange={(nextValue) => update(path, nextValue)}
          placeholder="/images/example.webp"
        />
      );
    }

    if (isLongTextKey(label)) {
      return (
        <label className="admin-field">
          <span>{humanizeKey(label)}</span>
          <textarea className="admin-textarea" value={String(current || "")} onChange={(event) => update(path, event.target.value)} />
        </label>
      );
    }

    return (
      <label className="admin-field">
        <span>{humanizeKey(label)}</span>
        <input
          className="admin-input"
          placeholder={isUrlKey(label) ? "/page-or-image-url" : undefined}
          value={String(current || "")}
          onChange={(event) => update(path, event.target.value)}
        />
      </label>
    );
  };

  return (
    <div className="admin-json-editor">
      <textarea hidden name="jsonData" value={serialized} readOnly />
      {renderValue(value, [], "Content")}
    </div>
  );
}
