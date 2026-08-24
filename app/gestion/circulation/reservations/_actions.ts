"use server";

import { revalidatePath } from "next/cache";
import {
  assignCopy,
  cancelHold,
  clearReshelving,
  fulfilHold,
  placeHold,
  type HoldRefusal,
} from "@/lib/holds";
import type { HoldActionState, HoldMessageKey } from "./_lib/state";
import { requireSession } from "../../../(auth)/_lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

const REFUSALS: Record<HoldRefusal, HoldMessageKey> = {
  HOLD_NOT_FOUND: "errHoldNotFound",
  PATRON_NOT_FOUND: "errPatronNotFound",
  ITEM_NOT_FOUND: "errItemNotFound",
  RECORD_NOT_FOUND: "errRecordNotFound",
  PATRON_NOT_ALLOWED: "errPatronNotAllowed",
  ALREADY_HELD: "errAlreadyHeld",
  ITEM_ON_LOAN: "errItemOnLoan",
  ITEM_WRONG_TITLE: "errItemWrongTitle",
  ITEM_ALREADY_SET_ASIDE: "errItemAlreadySetAside",
  NO_COPY_ASSIGNED: "errNoCopyAssigned",
};

function refresh() {
  revalidatePath("/gestion/circulation/reservations");
  revalidatePath("/gestion/circulation");
  revalidatePath("/gestion");
}

/**
 * One action for the whole screen: the row buttons and the two forms all post
 * here with an `intent`, which keeps a single feedback line for the page
 * rather than one per button.
 */
export async function holdAction(
  _previous: HoldActionState,
  formData: FormData,
): Promise<HoldActionState> {
  await requireSession("gestion");

  const intent = text(formData, "intent");
  const holdId = Number(text(formData, "holdId"));

  const run = async () => {
    switch (intent) {
      case "place":
        return {
          result: await placeHold(
            text(formData, "patronBarcode"),
            text(formData, "itemBarcode"),
          ),
          okKey: "placed" as const,
          okValues: (detail?: string) => ({ title: detail ?? "" }),
        };
      case "assign":
        return {
          result: await assignCopy(holdId, text(formData, "itemBarcode")),
          okKey: "assigned" as const,
          okValues: (detail?: string) => ({ barcode: detail ?? "" }),
        };
      case "cancel":
        return {
          result: await cancelHold(holdId),
          okKey: "cancelled" as const,
          okValues: () => ({}),
        };
      case "lend":
        return {
          result: await fulfilHold(holdId),
          okKey: "lent" as const,
          okValues: (detail?: string) => ({ title: detail ?? "" }),
        };
      default:
        return {
          result: await clearReshelving(text(formData, "itemBarcode")),
          okKey: "cleared" as const,
          okValues: (detail?: string) => ({ barcode: detail ?? "" }),
        };
    }
  };

  const { result, okKey, okValues } = await run();
  if (!result.ok) {
    // A refusal about a specific copy is only actionable if it names it.
    return {
      kind: "error",
      key: REFUSALS[result.reason],
      values: { barcode: result.detail ?? "" },
    };
  }

  refresh();
  return { kind: "ok", key: okKey, values: okValues(result.detail) };
}
