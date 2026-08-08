import { prisma } from "../lib/prisma";

async function main() {
  // One read, exercising a relation.
  const record = await prisma.bibliographicRecord.findFirst({
    include: {
      contributions: { include: { author: true } },
      items: { include: { location: true } },
    },
  });

  if (!record) {
    throw new Error("Connected, but no bibliographic record found. Run: npx prisma db seed");
  }

  console.log("✅ Connected");
  console.log(`   Record: ${record.title} (${record.publicationYear ?? "n.d."})`);
  console.log(
    `   Author: ${record.contributions
      .map((c) => `${c.author.forename ?? ""} ${c.author.name}`.trim())
      .join(", ")}`,
  );
  console.log(
    `   Items:  ${record.items
      .map((i) => `${i.barcode} @ ${i.location?.label ?? "—"}`)
      .join(", ")}`,
  );

  // Confirm the two constraints the Prisma schema language cannot express
  // actually landed in the database.
  const constraints = await prisma.$queryRaw<{ name: string }[]>`
    SELECT conname AS name FROM pg_constraint WHERE conname = 'items_record_xor_issue'
    UNION ALL
    SELECT indexname AS name FROM pg_indexes WHERE indexname = 'one_active_loan_per_item'
  `;
  console.log(
    `   Constraints: ${constraints.map((c) => c.name).join(", ") || "MISSING"}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("❌ Verification failed:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
