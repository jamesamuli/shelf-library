import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const t = prisma as unknown as Record<string, { count: () => Promise<number> }>;
  const names = [
    "bibliographicRecord","documentType","recordStatus","recordLanguage","author","contribution",
    "publisher","recordPublisher","collection","series","classificationIndex","subject","subjectLabel",
    "recordSubject","genre","recordGenre","item","issue","location","section","itemStatus",
    "statisticalCode","patron","schoolClass","patronCategory","patronStatus","loan","hold",
    "reshelvingItem","staffUser","role","rolePermission","staffUserRole","customFieldDefinition",
  ];
  for (const n of names) {
    try { console.log(`${String(await t[n].count()).padStart(6)}  ${n}`); }
    catch { console.log(`     ?  ${n}`); }
  }
}
main().then(() => process.exit(0));
