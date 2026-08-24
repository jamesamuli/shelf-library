import { templateCsv } from "@/lib/patron-import";
import { requireSession } from "../../../../(auth)/_lib/session";

/**
 * The import template, with real headers and filled example rows.
 *
 * UTF-8 BOM on purpose: without it Excel on Windows opens a UTF-8 CSV as
 * Latin-1 and turns "Élève" into "Ã‰lÃ¨ve" the moment the librarian saves it
 * back.
 */
export async function GET() {
  await requireSession("gestion");

  return new Response(`﻿${templateCsv()}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modele-lecteurs.csv"',
    },
  });
}
