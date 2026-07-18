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

type LanguagePreset = {
  code: string;
  name: string;
  nativeName: string;
  shortLabel: string;
  textDirection?: "ltr" | "rtl";
};

const languagePresets: LanguagePreset[] = [
  { code: "fr", name: "French", nativeName: "Francais", shortLabel: "FR" },
  { code: "de", name: "German", nativeName: "Deutsch", shortLabel: "DE" },
  { code: "es", name: "Spanish", nativeName: "Espanol", shortLabel: "ES" },
  { code: "it", name: "Italian", nativeName: "Italiano", shortLabel: "IT" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues", shortLabel: "PT" },
  { code: "tr", name: "Turkish", nativeName: "Turkce", shortLabel: "TR" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", shortLabel: "NL" },
  { code: "ar", name: "Arabic", nativeName: "Arabic", shortLabel: "AR", textDirection: "rtl" },
];

function parseSettings(jsonData: string): CmsLanguageSettings {
  try {
    return normalizeLanguageSettings(JSON.parse(jsonData) as CmsLanguageSettings);
  } catch {
    return fallbackLanguageSettings;
  }
}

function fromPreset(preset: LanguagePreset, defaultLanguage: string): CmsLanguage {
  return {
    ...preset,
    flagEmoji: "",
    pathPrefix: languagePathPrefix(preset.code, defaultLanguage),
    textDirection: preset.textDirection || "ltr",
    active: true,
    isDefault: false,
  };
}

function blankLanguage(index: number, defaultLanguage: string): CmsLanguage {
  const code = `zz-${String(index + 1).padStart(2, "0")}`;
  return {
    code,
    name: "New language",
    nativeName: "New language",
    shortLabel: "NEW",
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

function languageLocation(language: CmsLanguage, isDefault: boolean) {
  if (isDefault) return "Main website";
  return language.pathPrefix || `/${language.code}`;
}

export function LanguageManagerEditor({ jsonData }: { jsonData: string }) {
  const initialSettings = useMemo(() => parseSettings(jsonData), [jsonData]);
  const [settings, setSettings] = useState(initialSettings);
  const [selectedPreset, setSelectedPreset] = useState(languagePresets[0]?.code || "custom");
  const [pendingRemovalIndex, setPendingRemovalIndex] = useState<number | null>(null);
  const serialized = useMemo(() => JSON.stringify(settings, null, 2), [settings]);
  const existingCodes = useMemo(() => new Set(settings.languages.map((language) => language.code)), [settings.languages]);
  const availablePresets = useMemo(() => languagePresets.filter((preset) => !existingCodes.has(preset.code)), [existingCodes]);
  const selectedPresetValue = selectedPreset === "custom" || !existingCodes.has(selectedPreset) ? selectedPreset : availablePresets[0]?.code || "custom";
  const pendingRemovalLanguage = pendingRemovalIndex === null ? null : settings.languages[pendingRemovalIndex] || null;

  const updateLanguage = (index: number, updates: Partial<CmsLanguage>) => {
    setSettings((current) => {
      const languages = current.languages.map((language, languageIndex) =>
        languageIndex === index
          ? (() => {
              const nextCode = updates.code !== undefined ? normalizeLanguageCode(updates.code) : language.code;
              const codeChanged = nextCode !== language.code;
              const preset = codeChanged ? languagePresets.find((item) => item.code === nextCode) : undefined;

              return {
                ...language,
                ...(preset
                  ? {
                      name: preset.name,
                      nativeName: preset.nativeName,
                      shortLabel: preset.shortLabel,
                      textDirection: preset.textDirection || "ltr",
                    }
                  : {}),
                ...updates,
                code: nextCode,
                pathPrefix:
                  updates.pathPrefix !== undefined
                    ? normalizePathPrefix(updates.pathPrefix)
                    : codeChanged
                      ? languagePathPrefix(nextCode, current.defaultLanguage)
                      : language.pathPrefix,
              };
            })()
          : language,
      );
      return nextSettings(current, languages);
    });
  };

  const addLanguage = () => {
    setSettings((current) => {
      const preset = languagePresets.find((item) => item.code === selectedPresetValue);
      if (preset && current.languages.some((language) => language.code === preset.code)) return current;
      const nextLanguage = preset ? fromPreset(preset, current.defaultLanguage) : blankLanguage(current.languages.length, current.defaultLanguage);
      return nextSettings(current, [...current.languages, nextLanguage]);
    });
  };

  const requestRemoveLanguage = (index: number) => {
    const language = settings.languages[index];
    if (!language || language.code === settings.defaultLanguage || settings.languages.length <= 1) return;
    setPendingRemovalIndex(index);
  };

  const confirmRemoveLanguage = () => {
    if (pendingRemovalIndex === null) return;

    setSettings((current) => {
      const language = current.languages[pendingRemovalIndex];
      if (!language || language.code === current.defaultLanguage || current.languages.length <= 1) return current;
      return nextSettings(current, current.languages.filter((_, languageIndex) => languageIndex !== pendingRemovalIndex));
    });
    setPendingRemovalIndex(null);
  };

  const makeDefault = (code: string) => {
    setSettings((current) => nextSettings(current, current.languages, code));
  };

  return (
    <div className="admin-language-manager">
      <textarea hidden name="jsonData" value={serialized} readOnly />

      <section className="admin-editor-section">
        <div className="admin-simple-language-header">
          <div>
            <strong>Website languages</strong>
            <p className="admin-muted">Choose the languages visitors can switch to from the website menu.</p>
          </div>
          <div className="admin-simple-language-add">
            <select className="admin-select" value={selectedPresetValue} onChange={(event) => setSelectedPreset(event.target.value)}>
              {availablePresets.map((preset) => (
                <option value={preset.code} key={preset.code}>
                  {preset.name}
                </option>
              ))}
              <option value="custom">Custom language</option>
            </select>
            <button className="admin-button admin-button-primary" type="button" onClick={addLanguage}>
              Add language
            </button>
          </div>
        </div>

        <div className="admin-simple-language-list">
          {settings.languages.map((language, index) => {
            const codeIsValid = isValidLanguageCode(language.code);
            const isDefault = language.code === settings.defaultLanguage;

            return (
              <fieldset className="admin-simple-language-card" key={`${language.code}-${index}`}>
                <div className="admin-simple-language-card-header">
                  <div>
                    <legend>{language.name || "Language"}</legend>
                    <p className="admin-muted">
                      {isDefault ? "Default language" : "Website language"} - {languageLocation(language, isDefault)}
                    </p>
                  </div>
                  <label className="admin-simple-toggle">
                    <input
                      type="checkbox"
                      checked={isDefault || language.active !== false}
                      onChange={(event) => updateLanguage(index, { active: event.target.checked })}
                      disabled={isDefault}
                    />
                    <span>Show</span>
                  </label>
                </div>

                <div className="admin-grid">
                  <label className="admin-field">
                    <span>Language name</span>
                    <input className="admin-input" value={language.name} onChange={(event) => updateLanguage(index, { name: event.target.value })} />
                  </label>
                  <label className="admin-field">
                    <span>Menu label</span>
                    <input
                      className="admin-input"
                      value={language.shortLabel || ""}
                      onChange={(event) => updateLanguage(index, { shortLabel: event.target.value.toUpperCase() })}
                      placeholder="FR"
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>Website address folder</span>
                  <input
                    className="admin-input"
                    value={language.pathPrefix || ""}
                    onChange={(event) => updateLanguage(index, { pathPrefix: event.target.value })}
                    placeholder={isDefault ? "Main website" : `/${language.code}`}
                    disabled={isDefault}
                  />
                </label>

                <details className="admin-simple-language-advanced">
                  <summary>Advanced</summary>
                  <div className="admin-grid">
                    <label className="admin-field">
                      <span>Language code</span>
                      <input
                        className="admin-input"
                        value={language.code}
                        onChange={(event) => updateLanguage(index, { code: event.target.value })}
                        placeholder="fr"
                        aria-invalid={!codeIsValid}
                        disabled={isDefault}
                      />
                      {!codeIsValid ? <span className="admin-image-error">Use a short code like fr, de, ar, pt-br.</span> : null}
                    </label>
                    <label className="admin-field">
                      <span>Native name</span>
                      <input
                        className="admin-input"
                        value={language.nativeName || ""}
                        onChange={(event) => updateLanguage(index, { nativeName: event.target.value })}
                        placeholder={language.name}
                      />
                    </label>
                  </div>

                  <div className="admin-grid">
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
                    <label className="admin-field">
                      <span>Optional symbol</span>
                      <input
                        className="admin-input"
                        value={language.flagEmoji || ""}
                        onChange={(event) => updateLanguage(index, { flagEmoji: event.target.value })}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                </details>

                <div className="admin-actions">
                  {!isDefault ? (
                    <button className="admin-button admin-button-secondary" type="button" onClick={() => makeDefault(language.code)} disabled={!codeIsValid}>
                      Make default
                    </button>
                  ) : null}
                  {!isDefault && settings.languages.length > 1 ? (
                    <button className="admin-button admin-button-danger" type="button" onClick={() => requestRemoveLanguage(index)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      {pendingRemovalLanguage ? (
        <div className="admin-confirm-backdrop">
          <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-language-title">
            <h3 id="remove-language-title">Remove {pendingRemovalLanguage.name || pendingRemovalLanguage.code}?</h3>
            <p className="admin-muted">
              This language will be removed from the website language list after you save. Existing translated content will stay preserved, but visitors will
              not be able to switch to this language while it is disabled here.
            </p>
            <div className="admin-actions">
              <button className="admin-button admin-button-secondary" type="button" onClick={() => setPendingRemovalIndex(null)}>
                Keep language
              </button>
              <button className="admin-button admin-button-danger" type="button" onClick={confirmRemoveLanguage}>
                Yes, remove language
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
