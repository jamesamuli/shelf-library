"use server";

import { revalidatePath } from "next/cache";
import { renewLoan, type RenewRefusal } from "@/lib/circulation";
import type { CirculationMessageKey } from "@/app/gestion/circulation/_lib/messages";
import type { AccountState } from "./_lib/state";
import { requireSession } from "../../(auth)/_lib/session";

const ERRORS: Record<RenewRefusal, CirculationMessageKey> = {
  LOAN_NOT_FOUND: "errLoanNotFound",
  PATRON_NOT_ALLOWED: "errRenewNotAllowed",
  LIMIT_REACHED: "errRenewLimit",
  NO_LATER_DATE: "errRenewNoLaterDate",
};

/**
 * Patron self-renewal. `ownedBy` comes from the session, never the form —
 * the loan id in the payload is attacker-controlled.
 */
export async function renewOwnLoanAction(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const session = await requireSession("opac");
  const loanId = Number(formData.get("loanId"));
  if (!Number.isInteger(loanId)) {
    return { kind: "error", key: "errLoanNotFound", values: {} };
  }

  const result = await renewLoan(loanId, { ownedBy: Number(session.sub) });
  if (!result.ok) {
    return { kind: "error", key: ERRORS[result.reason], values: {} };
  }

  revalidatePath("/catalogue/compte");
  return {
    kind: "ok",
    key: "renewOk",
    values: { title: result.title, date: result.dueOn.toISOString() },
  };
}
