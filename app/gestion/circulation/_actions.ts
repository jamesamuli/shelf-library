"use server";

import { revalidatePath } from "next/cache";
import {
  checkIn,
  checkOut,
  renewLoan,
  type CheckOutRefusal,
  type RenewRefusal,
} from "@/lib/circulation";
import type { CirculationMessageKey, DeskState } from "./_lib/messages";
import { requireSession } from "../../(auth)/_lib/session";

/**
 * Desk actions. Results are message keys plus values, not sentences — the
 * client component holds the dictionary and picks the locale.
 *
 * Every action re-checks the session: the layout guards page rendering, not
 * action invocation.
 */

const CHECK_OUT_ERRORS: Record<CheckOutRefusal, CirculationMessageKey> = {
  PATRON_NOT_FOUND: "errPatronNotFound",
  ITEM_NOT_FOUND: "errItemNotFound",
  PATRON_EXPIRED: "errPatronExpired",
  PATRON_BLOCKED: "errPatronBlocked",
  PATRON_NOT_ALLOWED: "errPatronNotAllowed",
  ITEM_NOT_LOANABLE: "errItemNotLoanable",
  ALREADY_ON_LOAN_HERE: "errAlreadyOnLoanHere",
  ALREADY_ON_LOAN_ELSEWHERE: "errAlreadyOnLoanElsewhere",
  QUOTA_REACHED: "errQuotaReached",
};

const RENEW_ERRORS: Record<RenewRefusal, CirculationMessageKey> = {
  LOAN_NOT_FOUND: "errLoanNotFound",
  PATRON_NOT_ALLOWED: "errRenewNotAllowed",
  LIMIT_REACHED: "errRenewLimit",
  NO_LATER_DATE: "errRenewNoLaterDate",
};

/** ISO date, so the client formats it in the reader's locale. */
const iso = (date: Date) => date.toISOString();

export async function checkOutAction(
  _previous: DeskState,
  formData: FormData,
): Promise<DeskState> {
  await requireSession("gestion");

  const patronId = Number(formData.get("patronId"));
  const barcode = String(formData.get("barcode") ?? "");
  const force = formData.get("force") === "1";

  if (!Number.isInteger(patronId)) {
    return { kind: "error", key: "errPatronNotFound", values: {} };
  }

  const result = await checkOut(patronId, barcode, { force });
  if (!result.ok) {
    return {
      kind: "error",
      key: CHECK_OUT_ERRORS[result.reason],
      // Echoed back so the "check out anyway" form can resubmit it: React
      // clears the field on every submission, successful or not.
      values: { detail: result.detail ?? "", barcode },
      overridable: result.overridable,
    };
  }

  revalidatePath("/gestion/circulation");
  revalidatePath("/gestion");
  return {
    kind: "ok",
    key: "checkOutOk",
    values: { title: result.title, date: iso(result.dueOn) },
  };
}

export async function checkInAction(
  _previous: DeskState,
  formData: FormData,
): Promise<DeskState> {
  await requireSession("gestion");

  const result = await checkIn(String(formData.get("barcode") ?? ""));
  if (!result.ok) {
    return {
      kind: "error",
      key: result.reason === "NOT_ON_LOAN" ? "errNotOnLoan" : "errItemNotFound",
      values: { detail: result.detail ?? "" },
    };
  }

  revalidatePath("/gestion/circulation");
  revalidatePath("/gestion");
  return {
    kind: "ok",
    key: result.daysLate > 0 ? "checkInLate" : "checkInOk",
    values: {
      title: result.title,
      name: result.patronName,
      count: String(result.daysLate),
    },
  };
}

export async function renewAction(
  _previous: DeskState,
  formData: FormData,
): Promise<DeskState> {
  await requireSession("gestion");

  const loanId = Number(formData.get("loanId"));
  const force = formData.get("force") === "1";
  if (!Number.isInteger(loanId)) {
    return { kind: "error", key: "errLoanNotFound", values: {} };
  }

  const result = await renewLoan(loanId, { asStaff: true, force });
  if (!result.ok) {
    return {
      kind: "error",
      key: RENEW_ERRORS[result.reason],
      values: {},
      overridable: result.overridable,
    };
  }

  revalidatePath("/gestion/circulation");
  revalidatePath("/gestion");
  return {
    kind: "ok",
    key: "renewOk",
    values: { title: result.title, date: iso(result.dueOn) },
  };
}
