"use client";

import { useMemo, useState } from "react";
import {
  type CmsLanguage,
  type CmsLanguageSettings,
  fallbackLanguageSettings,
  isValidLanguageCode,
  languagePathPrefix,
  normalizeLanguageCode,
  normalizeLanguageSettings,
  normalizePathPrefix,
} from "@/src/lib/cms/language-utils";

function parseSettings(jsonData: string): CmsLanguageSettings {
  try {
    return normalizeLanguageSettings(JSON.parse(jsonData) as CmsLanguageSettings);
  } catch {
    return fallbackLanguageSettings;
  }
}

function blankLanguage(index: number, defaultLanguage: string): CmsLanguage {
  const code = `zz-${String(index + 1).padStart(2, "0")}`;
  return {
    code,
    name: "New language",
    nativeName: "New language",
    shortLabel: code.toUpperCase(),
    flagEmoji: "",
    pathPrefix: languagePathPrefix(code, defaultLanguage),
    textDirection: "ltr",
    active: true,
    isDefault: false,
  };
}

function nextSettings(settings: CmsLanguageSettings, languages: CmsLanguage[], defaultLanguage = settings.defaultLanguage): CmsLanguageSettings {
  const normalizedDefault = normalizeLanguageCode(defaultLanguage || languages[0]?.code || "en");
  return normalizeLanguageSettings({
    defaultLanguage: normalizedDefault,
    languages: languages.map((language) => ({
      ...language,
      code: normalizeLanguageCode(language.code),
      pathPrefix: languagePathPrefix(language.code, normalizedDefault, language.pathPrefix),
      isDefault: normalizeLanguageCode(language.code) === normalizedDefault,
    })),
  });
}

export function LanguageManagerEditor({ jsonData }: { jsonData: string }) {
  const initialSettings = useMemo(() => parseSettings(jsonData), [jsonData]);
  const [settings, setSettings] = useState(initialSettings);
  const serialized = useMemo(() => JSON.stringify(settings, null, 2), [settings]);

  const updateLanguage = (index: number, updates: Partial<CmsLanguage>) => {
    setSettings((current) => {
      const languages = current.languages.map((language, languageIndex) =>
        languageIndex === index
          ? {
              ...language,
              ...updates,
              code: updates.code !== undefined ? normalizeLanguageCode(updates.code) : language.code,
              pathPrefix: updates.pathPrefix !== undefined ? normalizePathPrefix(updates.pathPrefix) : language.pathPrefix,
            }
          : language,
      );
      return nextSettings(current, languages);
    });
  };

  const addLanguage = () => {
    setSettings((current) => nextSettings(current, [...current.languages, blankLanguage(current.languages.length, current.defaultLanguage)]));
  };

  const removeLanguage = (index: number) => {
    setSettings((current) => {
      const language = current.languages[index];
      if (!language || language.code === current.defaultLanguage || current.languages.length <= 1) return current;
      return nextSettings(current, current.languages.filter((_, languageIndex) => languageIndex !== index));
    });
  };

  const makeDefault = (code: string) => {
    setSettings((current) => nextSettings(current, current.languages, code));
  };

  return (
    <div className="admin-language-manager">
      <textarea hidden name="jsonData" value={serialized} readOnly />

      <section className="admin-editor-section">
        <div className="admin-editor-toolbar">
          <div>
            <strong>Website languages</strong>
            <p className="admin-muted">Add the languages that should appear in the public language switcher and admin language fields.</p>
          </div>
          <button className="admin-button admin-button-secondary" type="button" onClick={addLanguage}>
            Add language
          </button>
        </div>

        <div className="admin-json-list">
          {settings.languages.map((language, index) => {
            const codeIsValid = isValidLanguageCode(language.code);
            const isDefault = language.code === settings.defaultLanguage;

            return (
              <fieldset className="admin-json-array-item" key={`${language.code}-${index}`}>
                <legend>
                  {language.name || "Language"} {isDefault ? "(default)" : ""}
                </legend>
                <div className="admin-grid">
                  <label className="admin-field">
                    <span>Language code</span>
                    <input
                      className="admin-input"
                      value={language.code}
                      onChange={(event) => updateLanguage(index, { code: event.target.value })}
                      placeholder="fr"
                      aria-invalid={!codeIsValid}
                    />
                    {!codeIsValid ? <span className="admin-image-error">Use a code like fr, de, ar, pt-br.</span> : null}
                  </label>
                  <label className="admin-field">
                    <span>Public name</span>
                    <input className="admin-input" value={language.name} onChange={(event) => updateLanguage(index, { name: event.target.value })} />
                  </label>
                </div>

                <div className="admin-grid">
                  <label className="admin-field">
                    <span>Native name</span>
                    <input
                      className="admin-input"
                      value={language.nativeName || ""}
                      onChange={(event) => updateLanguage(index, { nativeName: event.target.value })}
                      placeholder={language.name}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Short label</span>
                    <input
                      className="admin-input"
                      value={language.shortLabel || ""}
                      onChange={(event) => updateLanguage(index, { shortLabel: event.target.value })}
                      placeholder={language.code.toUpperCase()}
                    />
                  </label>
                </div>

                <div className="admin-grid">
                  <label className="admin-field">
                    <span>Path prefix</span>
                    <input
                      className="admin-input"
                      value={language.pathPrefix || ""}
                      onChange={(event) => updateLanguage(index, { pathPrefix: event.target.value })}
                      placeholder={isDefault ? "" : `/${language.code}`}
                      disabled={isDefault}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Text direction</span>
                    <select
                      className="admin-select"
                      value={language.textDirection || "ltr"}
                      onChange={(event) => updateLanguage(index, { textDirection: event.target.value === "rtl" ? "rtl" : "ltr" })}
                    >
                      <option value="ltr">Left to right</option>
                      <option value="rtl">Right to left</option>
                    </select>
                  </label>
                </div>

                <div className="admin-grid">
                  <label className="admin-field">
                    <span>Flag or symbol</span>
                    <input
                      className="admin-input"
                      value={language.flagEmoji || ""}
                      onChange={(event) => updateLanguage(index, { flagEmoji: event.target.value })}
                      placeholder="Optional"
                    />
                  </label>
                  <div className="admin-field">
                    <span>Controls</span>
                    <label className="admin-checkbox">
                      <input type="checkbox" checked={language.active !== false} onChange={(event) => updateLanguage(index, { active: event.target.checked })} />
                      <span>Show this language</span>
                    </label>
                  </div>
                </div>

                <div className="admin-actions">
                  {!isDefault ? (
                    <button className="admin-button admin-button-secondary" type="button" onClick={() => makeDefault(language.code)} disabled={!codeIsValid}>
                      Make default
                    </button>
                  ) : null}
                  {!isDefault && settings.languages.length > 1 ? (
                    <button className="admin-button admin-button-secondary" type="button" onClick={() => removeLanguage(index)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>
    </div>
  );
}
