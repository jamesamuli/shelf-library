"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import type { Messages, PortalCopy } from "@/lib/i18n";
import { login, type LoginState } from "../_actions/login";
import type { Portal } from "../_lib/portals";

const initialState: LoginState = {};

const FIELD =
  "w-full rounded-control border border-border bg-surface py-2.5 pl-10 text-body text-foreground placeholder:text-foreground-subtle outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 1 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="4.5" />
    </svg>
  );
}

function LockIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5"
      aria-hidden="true"
    >
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="m4 20 16-16" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function LoginForm({
  portal,
  copy,
  messages,
  next,
}: {
  portal: Portal;
  copy: PortalCopy;
  messages: Messages;
  next?: string;
}) {
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
      <input type="hidden" name="portal" value={portal.slug} />
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
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-subtle">
            <UserIcon />
          </span>
          <input
            id={identifierId}
            name="identifier"
            type="text"
            inputMode={portal.identifierInputMode}
            autoComplete={portal.identifierAutoComplete}
            placeholder={copy.identifierPlaceholder}
            autoFocus
            aria-invalid={identifierError ? true : undefined}
            aria-describedby={identifierError ? identifierErrorId : undefined}
            className={`${FIELD} pr-3`}
          />
        </div>
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
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-subtle">
            <LockIcon />
          </span>
          <input
            id={passwordId}
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            placeholder={messages.passwordPlaceholder}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? passwordErrorId : undefined}
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-label={
              revealed ? messages.hidePassword : messages.showPassword
            }
            className="absolute inset-y-0 right-0 flex items-center rounded-control px-3 text-foreground-subtle outline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <EyeIcon off={revealed} />
          </button>
        </div>
        {passwordError ? (
          <p id={passwordErrorId} className="text-caption text-danger">
            {passwordError}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link
          href={`/login/${portal.slug}/mot-de-passe-oublie`}
          className="text-caption text-accent underline-offset-2 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {messages.forgotPassword}
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="cluster justify-center gap-inline rounded-control bg-primary px-4 py-3 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <LockIcon className="size-4" />
        {pending ? messages.signingIn : messages.signIn}
      </button>
    </form>
  );
}
