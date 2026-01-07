import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Helper to parse worker names from the format "@Name1,@Name2" or "Name1,Name2"
function parseWorkers(workersStr: string): string[] {
  if (!workersStr) return [];
  return workersStr
    .split(",")
    .map((w) => w.trim().replace(/^@/, "").trim())
    .filter((w) => w.length > 0);
}

// Helper to parse number, handling "Na", empty strings, commas in numbers, etc.
function parseNumber(value: string | null | undefined): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value?.toLowerCase() === "na" ||
    value?.toLowerCase() === "n/a"
  ) {
    return null;
  }
  // Remove commas and any non-numeric chars except . and -
  const cleaned = String(value).replace(/,/g, "").trim();
  // Handle weird values like "I0" which should be "10"
  const fixed = cleaned.replace(/^I/, "1");
  const num = parseFloat(fixed);
  return isNaN(num) ? null : num;
}

// Helper to parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Skip obvious non-date strings
  const lowerStr = trimmed.toLowerCase();
  if (
    lowerStr.includes("end of") ||
    lowerStr.includes("end ") ||
    lowerStr === "reported above" ||
    lowerStr.includes("inputed") ||
    lowerStr.startsWith("end") ||
    lowerStr.length < 6
  ) {
    return null;
  }

  // Format: "Dec 17, 2024, 12:50:08 AM" or "Jan 8, 2025, 9:49:31 PM"
  let date = new Date(trimmed);
  if (!isNaN(date.getTime()) && date.getFullYear() >= 2020) {
    return date;
  }

  // Format: "2/6/2025" or "12/29/2025" or "2/6/25"
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[0]) - 1;
    const day = parseInt(slashParts[1]);
    let year = parseInt(slashParts[2]);
    if (year < 100) year += 2000;
    if (month >= 0 && month < 12 && day > 0 && day <= 31 && year >= 2020) {
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Format with time: "6/29/2025 1:07:52"
  const spaceParts = trimmed.split(" ");
  if (spaceParts.length >= 1) {
    const datePart = spaceParts[0];
    const dateSlashParts = datePart.split("/");
    if (dateSlashParts.length === 3) {
      const month = parseInt(dateSlashParts[0]) - 1;
      const day = parseInt(dateSlashParts[1]);
      let year = parseInt(dateSlashParts[2]);
      if (year < 100) year += 2000;
      if (month >= 0 && month < 12 && day > 0 && day <= 31 && year >= 2020) {
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  return null;
}

// Parse CSV properly handling quoted fields with commas and newlines
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse entire CSV content handling multi-line fields
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else if (char === "\r") {
      // Skip carriage returns
    } else {
      currentField += char;
    }
  }

  // Don't forget the last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

interface FieldLogData {
  date: Date;
  location: string;
  workersNames: string[];
  workerCount: number;
  hoursWorked: number;
  strandHungFootage: number | null;
  polesAttached: number | null;
  fiberLashedFootage: number | null;
  fiberPulledFootage: number | null;
  drilledFootage: number | null;
  plowedFootage: number | null;
  handholesPlaced: number | null;
  vaultsPlaced: number | null;
  mstsInstalled: number | null;
  guysPlaced: number | null;
  slackLoops: number | null;
  risersInstalled: number | null;
  spliceCases: number | null;
  notes: string | null;
  submittedBy: string;
  originalTimestamp: Date | null;
}

async function seedFieldLogs() {
  console.log("🌱 Starting Field Logs Seeder...\n");

  // Read the CSV file
  const csvPath = path.join(
    process.cwd(),
    "scripts",
    "west-mountain-data.csv"
  );

  // Check if local copy exists, if not use Downloads folder
  let csvContent: string;
  if (fs.existsSync(csvPath)) {
    csvContent = fs.readFileSync(csvPath, "utf-8");
  } else {
    const downloadsPath =
      "/Users/gabecabrera/Downloads/west mountain fiber project updates - Sheet1 (2).csv";
    if (fs.existsSync(downloadsPath)) {
      csvContent = fs.readFileSync(downloadsPath, "utf-8");
      // Copy to scripts folder for future use
      fs.writeFileSync(csvPath, csvContent);
      console.log("📁 Copied CSV to scripts folder for future use\n");
    } else {
      console.error("❌ CSV file not found!");
      process.exit(1);
    }
  }

  // Step 1: Clear all existing FieldWorkLog data
  console.log("🗑️  Clearing existing FieldWorkLog data...");
  const deleteResult = await prisma.fieldWorkLog.deleteMany({});
  console.log(`   Deleted ${deleteResult.count} existing records\n`);

  // Step 2: Parse CSV
  console.log("📊 Parsing CSV data...");
  const rows = parseCSV(csvContent);
  console.log(`   Found ${rows.length} rows (including header)\n`);

  // Column mapping based on CSV headers:
  // 0: where did you work today? (location)
  // 1: Who was working on this today? (workers)
  // 2: How many people? (workerCount)
  // 3: hours worked today (hoursWorked)
  // 4: strand hung footage
  // 5: poles attached to
  // 6: fiber lashed footage
  // 7: fiber pulled footage
  // 8: drilled footage
  // 9: Plowed footage
  // 10: Polyconcrete hh's (ignored - not in schema)
  // 11: hand holes placed
  // 12: Vaults placed
  // 13: Msts installed
  // 14: guys placed
  // 15: Slack loops
  // 16: Risers
  // 17: Splice cases
  // 18: Notes
  // 19: submited by
  // 20: time stamp

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
    missingDates: [] as string[],
  };

  const logsToCreate: FieldLogData[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    const location = row[0]?.trim() || "";
    const workers = row[1] || "";
    const workerCountStr = row[2] || "";
    const hoursWorkedStr = row[3] || "";
    const strandHungStr = row[4] || "";
    const polesAttachedStr = row[5] || "";
    const fiberLashedStr = row[6] || "";
    const fiberPulledStr = row[7] || "";
    const drilledStr = row[8] || "";
    const plowedStr = row[9] || "";
    // Skip column 10 (Polyconcrete hh's)
    const handholesStr = row[11] || "";
    const vaultsStr = row[12] || "";
    const mstsStr = row[13] || "";
    const guysStr = row[14] || "";
    const slackLoopsStr = row[15] || "";
    const risersStr = row[16] || "";
    const spliceCasesStr = row[17] || "";
    const notes = row[18] || "";
    const submittedBy = row[19] || "";
    const timestamp = row[20] || "";

    // Skip empty rows or header/summary rows
    const locationLower = location.toLowerCase();
    if (
      !location ||
      locationLower.includes("end of") ||
      locationLower.startsWith("end ") ||
      locationLower === "reported above" ||
      locationLower.startsWith("also spent") ||
      locationLower.includes("paid $") ||
      location.length < 3
    ) {
      results.skipped++;
      continue;
    }

    // Skip rows that are clearly multi-line continuations
    if (
      location.startsWith('"') ||
      location.startsWith("Also ") ||
      location.startsWith("Paid ")
    ) {
      results.skipped++;
      continue;
    }

    // Parse date - try timestamp first, then submittedBy as fallback
    let parsedDate = parseDate(timestamp);
    let finalSubmittedBy = submittedBy?.replace(/^@/, "").trim() || "Unknown";

    if (!parsedDate) {
      // Try to parse submittedBy as date (sometimes date ends up there)
      const fallbackDate = parseDate(submittedBy);
      if (fallbackDate) {
        parsedDate = fallbackDate;
        // If date was in submittedBy, we need to figure out who submitted
        // Often it's in the notes or we mark as Unknown
        finalSubmittedBy = "Unknown";
      }
    }

    if (!parsedDate) {
      // Track entries without dates
      const hasData =
        workers ||
        parseNumber(hoursWorkedStr) ||
        parseNumber(strandHungStr) ||
        parseNumber(fiberLashedStr);
      if (hasData) {
        results.missingDates.push(`Row ${i + 1}: ${location.substring(0, 40)}`);
      }
      results.skipped++;
      continue;
    }

    const workerNames = parseWorkers(workers);
    const dateOnly = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate()
    );

    logsToCreate.push({
      date: dateOnly,
      location: location,
      workersNames: workerNames,
      workerCount:
        parseNumber(workerCountStr) ||
        workerNames.length ||
        0,
      hoursWorked: parseNumber(hoursWorkedStr) || 0,
      strandHungFootage: parseNumber(strandHungStr),
      polesAttached: parseNumber(polesAttachedStr) as number | null,
      fiberLashedFootage: parseNumber(fiberLashedStr),
      fiberPulledFootage: parseNumber(fiberPulledStr),
      drilledFootage: parseNumber(drilledStr),
      plowedFootage: parseNumber(plowedStr),
      handholesPlaced: parseNumber(handholesStr) as number | null,
      vaultsPlaced: parseNumber(vaultsStr) as number | null,
      mstsInstalled: parseNumber(mstsStr) as number | null,
      guysPlaced: parseNumber(guysStr) as number | null,
      slackLoops: parseNumber(slackLoopsStr) as number | null,
      risersInstalled: parseNumber(risersStr) as number | null,
      spliceCases: parseNumber(spliceCasesStr) as number | null,
      notes: notes?.trim() || null,
      submittedBy: finalSubmittedBy,
      originalTimestamp: parsedDate,
    });
  }

  console.log(`📝 Prepared ${logsToCreate.length} records for import\n`);

  // Step 3: Remove duplicates from our prepared data
  // (same date + location + submittedBy)
  const uniqueKey = (log: FieldLogData) =>
    `${log.date.toISOString().split("T")[0]}|${log.location}|${log.submittedBy}`;

  const seenKeys = new Set<string>();
  const uniqueLogs: FieldLogData[] = [];
  let duplicatesRemoved = 0;

  for (const log of logsToCreate) {
    const key = uniqueKey(log);
    if (seenKeys.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seenKeys.add(key);
    uniqueLogs.push(log);
  }

  console.log(
    `🔍 Removed ${duplicatesRemoved} duplicates, ${uniqueLogs.length} unique records remain\n`
  );

  // Step 4: Insert all records
  console.log("💾 Inserting records into database...");

  for (const log of uniqueLogs) {
    try {
      await prisma.fieldWorkLog.create({
        data: log,
      });
      results.imported++;
    } catch (err) {
      results.errors.push(
        `Error importing: ${log.location} - ${(err as Error).message}`
      );
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Imported: ${results.imported}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`🔄 Duplicates removed: ${duplicatesRemoved}`);

  if (results.missingDates.length > 0) {
    console.log(`\n⚠️  Entries with missing dates (${results.missingDates.length}):`);
    results.missingDates.slice(0, 10).forEach((msg) => console.log(`   - ${msg}`));
    if (results.missingDates.length > 10) {
      console.log(`   ... and ${results.missingDates.length - 10} more`);
    }
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`);
    results.errors.slice(0, 5).forEach((msg) => console.log(`   - ${msg}`));
    if (results.errors.length > 5) {
      console.log(`   ... and ${results.errors.length - 5} more`);
    }
  }

  // Verify final count
  const finalCount = await prisma.fieldWorkLog.count();
  console.log(`\n📈 Final database count: ${finalCount} records`);

  // Print date range
  const dateRange = await prisma.fieldWorkLog.aggregate({
    _min: { date: true },
    _max: { date: true },
  });
  if (dateRange._min.date && dateRange._max.date) {
    console.log(
      `📅 Date range: ${dateRange._min.date.toLocaleDateString()} - ${dateRange._max.date.toLocaleDateString()}`
    );
  }

  console.log("\n✨ Seeding complete!\n");
}

seedFieldLogs()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

