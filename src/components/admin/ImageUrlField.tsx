"use client";

import { useId, useRef, useState } from "react";

type ImageUrlFieldProps = {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  altText?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
};

function looksLikeImage(value: string) {
  return Boolean(value) && (/(\.avif|\.gif|\.jpe?g|\.png|\.svg|\.webp)(\?|#|$)/i.test(value) || value.startsWith("data:image/"));
}

export function ImageUrlField({ label, name, value, defaultValue = "", altText = "", placeholder = "/images/example.webp", onChange }: ImageUrlFieldProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [failed, setFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const currentValue = value ?? innerValue;
  const canPreview = looksLikeImage(currentValue) && !failed;

  const update = (nextValue: string) => {
    setFailed(false);
    setUploadError("");
    if (value === undefined) setInnerValue(nextValue);
    onChange?.(nextValue);
  };

  const uploadFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", label);

      const response = await fetch("/admin/api/media/upload/", {
        method: "POST",
        body: formData,
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? ((await response.json()) as { url?: string; error?: string }) : {};

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Upload failed. Please try again.");
      }

      update(payload.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-image-field">
      <div
        className={`admin-image-dropzone${isDragging ? " admin-image-dropzone-active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFile(event.dataTransfer.files[0]);
        }}
      >
        {canPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentValue} alt={altText || label} onError={() => setFailed(true)} />
        ) : (
          <div className="admin-image-empty">
            <strong>{label}</strong>
            <span>{currentValue ? "Preview unavailable" : "Drop an image here or upload from computer"}</span>
          </div>
        )}
      </div>
      <div className="admin-image-upload-row">
        <input
          ref={fileInputRef}
          id={fileInputId}
          className="admin-image-file-input"
          type="file"
          accept="image/*"
          onChange={(event) => void uploadFile(event.target.files?.[0])}
        />
        <button className="admin-button admin-button-secondary" type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? "Uploading..." : "Upload from computer"}
        </button>
        <span className="admin-image-status">Drag and drop also works.</span>
      </div>
      {uploadError ? <p className="admin-image-error">{uploadError}</p> : null}
      <details className="admin-image-details" open={!currentValue}>
        <summary>Change image</summary>
        <label className="admin-field">
          <span>{label} path</span>
          <input className="admin-input" name={name} value={currentValue} onChange={(event) => update(event.target.value)} placeholder={placeholder} />
        </label>
      </details>
    </div>
  );
}
