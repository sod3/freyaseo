"use client";

type BackupConfirmationButtonProps = {
  value: string;
  confirmationField: "confirmBackupId" | "confirmChangeId";
  label: string;
  message: string;
  className?: string;
};

export function BackupConfirmationButton({ value, confirmationField, label, message, className }: BackupConfirmationButtonProps) {
  return (
    <button
      className={className || "admin-button admin-button-secondary"}
      type="submit"
      name={confirmationField}
      value={value}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
