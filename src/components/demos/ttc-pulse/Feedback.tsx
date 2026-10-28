"use client";

import { FormEvent, useState } from "react";
import styles from "./About.module.css";

type State = "idle" | "sending" | "sent" | "error";

// Sends rider and recruiter feedback to the same Formspree inbox as the contact form.
export function Feedback({ formspreeId }: { formspreeId: string }) {
  const [state, setState] = useState<State>("idle");
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("_gotcha") || "")) {
      setState("sent");
      return;
    }
    if (String(data.get("message") || "").trim().length < 3) {
      setState("error");
      setNote("Write a few words first.");
      return;
    }
    try {
      setState("sending");
      const response = await fetch(`https://formspree.io/f/${formspreeId}`, { method: "POST", headers: { Accept: "application/json" }, body: data });
      if (!response.ok) throw new Error(String(response.status));
      setState("sent");
      setNote("Thanks. I read every message.");
      form.reset();
    } catch {
      setState("error");
      setNote("Could not send. Try again later.");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input type="hidden" name="_subject" value="TTC Pulse feedback" />
      <input type="hidden" name="source" value="ttc-pulse" />
      <label>
        What is missing, wrong or useful?
        <textarea name="message" rows={3} maxLength={2000} placeholder="For example: show my route at this hour" />
      </label>
      <label>
        Email (optional, only if you want a reply)
        <input name="email" type="email" maxLength={120} />
      </label>
      <label className={styles.hidden} aria-hidden="true">
        Leave this field empty
        <input name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending..." : "Send feedback"}
      </button>
      {note ? <p className={state === "sent" ? styles.ok : styles.err} role="status">{note}</p> : null}
    </form>
  );
}
