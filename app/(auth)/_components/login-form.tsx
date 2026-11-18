"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import { login, type LoginState } from "../_actions/login";

const initialState: LoginState = {};

const FIELD =
  "w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-body text-foreground placeholder:text-foreground-subtle outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-danger";

/**
 * Staff sign-in. Readers sign in with Google and have no password form.
 * `autoFocus` only when the staff page was asked for: the readers' page shows
 * this card too, and focus jumping into it would skip past their button.
 */
export function LoginForm({
  messages,
  next,
  autoFocus,
}: {
  messages: Messages;
  next?: string;
  autoFocus: boolean;
}) {
  const copy = messages.portals.gestion;
  const [state, formAction, pending] = useActionState(login, initialState);
  const [revealed, setRevealed] = useState(false);

  const identifierId = useId();
  const passwordId = useId();
  const identifierErrorId = `${identifierId}-error`;
  const passwordErrorId = `${passwordId}-error`;

  const identifierError = state.fieldErrors?.identifier;
  const passwordError = state.fieldErrors?.password;

  return (
    <form action={formAction} className="stack gap-content" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div aria-live="polite">
        {state.message ? (
          <p className="rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="stack gap-inline">
        <label htmlFor={identifierId} className="text-body-sm font-medium">
          {copy.identifierLabel}
        </label>
        <input
          id={identifierId}
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder={copy.identifierPlaceholder}
          autoFocus={autoFocus}
          aria-invalid={identifierError ? true : undefined}
          aria-describedby={identifierError ? identifierErrorId : undefined}
          className={FIELD}
        />
        {identifierError ? (
          <p id={identifierErrorId} className="text-caption text-danger">
            {identifierError}
          </p>
        ) : null}
      </div>

      <div className="stack gap-inline">
        <label htmlFor={passwordId} className="text-body-sm font-medium">
          {messages.password}
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            placeholder={messages.passwordPlaceholder}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? passwordErrorId : undefined}
            className={`${FIELD} pr-12`}
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-label={revealed ? messages.hidePassword : messages.showPassword}
            className="absolute inset-y-0 right-0 flex items-center rounded-control px-3 text-foreground-muted outline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
        {passwordError ? (
          <p id={passwordErrorId} className="text-caption text-danger">
            {passwordError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-control bg-primary px-8 max-sm:min-h-14 max-sm:w-full font-heading text-body font-semibold text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        >
          {pending ? messages.signingIn : messages.signIn}
        </button>
        <Link
          href="/login/gestion/mot-de-passe-oublie"
          className="inline-flex min-h-11 items-center text-body-sm font-medium text-primary underline underline-offset-2 outline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {messages.forgotPassword}
        </Link>
      </div>
    </form>
  );
}
