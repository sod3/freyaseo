"use client";

import { useState } from "react";
import { getCommon } from "@/src/content/common";
import type { Locale } from "@/src/types";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  message: string;
  website: string;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  service: "",
  budget: "",
  message: "",
  website: "",
};

export function ContactForm({ locale }: { locale: Locale }) {
  const { contact } = getCommon(locale);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = contact.errors.required;
    if (!form.lastName.trim()) next.lastName = contact.errors.required;
    if (!form.email.trim()) next.email = contact.errors.required;
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = contact.errors.email;
    if (!form.message.trim()) next.message = contact.errors.required;
    return next;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length || form.website) return;
    // TODO: Connect this validated payload to the future backend/email integration.
    setSubmitted(true);
    setForm(initialState);
  };

  const field = (
    name: keyof FormState,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={form[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] ? <small id={`${name}-error`}>{errors[name]}</small> : null}
    </label>
  );

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <h2>{contact.formTitle}</h2>
      <div className="form-grid">
        {field("firstName", contact.labels.firstName, "text", true)}
        {field("lastName", contact.labels.lastName, "text", true)}
      </div>
      {field("email", contact.labels.email, "email", true)}
      {field("company", contact.labels.company)}
      <div className="form-grid">
        <label className="field">
          <span>{contact.labels.service}</span>
          <select value={form.service} onChange={(event) => update("service", event.target.value)}>
            <option value="">{locale === "el" ? "Επιλέξτε" : "Select"}</option>
            {contact.services.map((service) => (
              <option value={service} key={service}>
                {service}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{contact.labels.budget}</span>
          <select value={form.budget} onChange={(event) => update("budget", event.target.value)}>
            <option value="">{locale === "el" ? "Επιλέξτε" : "Select"}</option>
            {contact.budgets.map((budget) => (
              <option value={budget} key={budget}>
                {budget}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{contact.labels.message} *</span>
        <textarea
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          rows={6}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message ? <small id="message-error">{errors.message}</small> : null}
      </label>
      <label className="sr-only" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
      </label>
      <button className="button button-primary justify-center" type="submit">
        {contact.labels.submit}
      </button>
      {submitted ? <p className="success-message">{contact.success}</p> : null}
    </form>
  );
}
