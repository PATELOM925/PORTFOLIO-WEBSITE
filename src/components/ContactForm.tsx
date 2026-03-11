"use client";

import { FormEvent, useMemo, useState } from "react";

interface ContactFormProps {
  formspreeId: string;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactForm({ formspreeId }: ContactFormProps) {
  const endpoint = useMemo(() => `https://formspree.io/f/${formspreeId}`, [formspreeId]);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const honeypot = String(formData.get("_gotcha") || "").trim();

    if (honeypot) {
      setState("success");
      setMessage("Thanks for reaching out.");
      form.reset();
      return;
    }

    if (name.length < 2) {
      setState("error");
      setMessage("Please provide your full name.");
      return;
    }

    if (!isValidEmail(email)) {
      setState("error");
      setMessage("Please enter a valid email.");
      return;
    }

    try {
      setState("submitting");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData
      });

      if (!response.ok) throw new Error("Submission failed");

      setState("success");
      setMessage("Message sent. I will get back to you shortly.");
      form.reset();
    } catch {
      setState("error");
      setMessage("Could not send your message. Please try again later.");
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <label>
        Name
        <input name="name" type="text" required maxLength={80} />
      </label>

      <label>
        Email
        <input name="email" type="email" required maxLength={120} />
      </label>

      <label className="hidden-field" aria-hidden="true">
        Leave this field empty
        <input name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <label>
        Message (optional)
        <textarea name="message" rows={6} maxLength={3000} placeholder="Share context or leave blank." />
      </label>

      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending..." : "Send Message"}
      </button>

      {message ? <p className={state === "success" ? "form-success" : "form-error"}>{message}</p> : null}
    </form>
  );
}
