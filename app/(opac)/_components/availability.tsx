import { fill, type Messages } from "@/lib/i18n";

/** Availability at a glance — legacy made you open the record to find out. */
export function Availability({
  totalItems,
  availableItems,
  messages,
}: {
  totalItems: number;
  availableItems: number;
  messages: Messages;
}) {
  if (totalItems === 0) {
    return (
      <span className="text-caption text-foreground-subtle">
        {messages.catalogue.noHoldings}
      </span>
    );
  }
  if (availableItems === 0) {
    return (
      <span className="cluster gap-1.5 text-caption text-foreground-muted">
        <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
        {messages.catalogue.allOnLoan}
      </span>
    );
  }
  return (
    <span className="cluster gap-1.5 text-caption text-success">
      <span aria-hidden="true" className="size-2 rounded-full bg-success" />
      {fill(messages.catalogue.available, {
        count: String(availableItems),
      })}
    </span>
  );
}
