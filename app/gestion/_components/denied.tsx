import type { Messages } from "@/lib/i18n";

/**
 * Shown in place of a screen the signed-in account may not open.
 *
 * Deliberately not a 404: hiding the screen's existence would leave a
 * librarian wondering whether the feature is missing or they are. Saying
 * "ask the person who manages accounts" is the actionable answer.
 */
export function Denied({ messages }: { messages: Messages }) {
  return (
    <div className="mx-auto max-w-md stack gap-content rounded-card border border-border bg-surface p-6 text-center">
      <h1 className="font-serif text-heading-3">{messages.accessDeniedTitle}</h1>
      <p className="text-body-sm text-foreground-muted">
        {messages.accessDeniedHint}
      </p>
    </div>
  );
}
