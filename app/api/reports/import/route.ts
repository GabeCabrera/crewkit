import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

interface ImportRow {
  location: string;
  workers: string;
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
  timestamp: string;
}

// Helper to parse worker names from the format "@Name1,@Name2"
function parseWorkers(workersStr: string): string[] {
  if (!workersStr) return [];
  return workersStr
    .split(",")
    .map((w) => w.trim().replace(/^@/, "").trim())
    .filter((w) => w.length > 0);
}

// Helper to parse number, handling "Na", empty strings, etc.
function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "" || value === "Na" || value === "NA" || value === "N/A") {
    return null;
  }
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

// Helper to parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  
  // Skip obvious non-date strings
  const lowerStr = trimmed.toLowerCase();
  if (lowerStr.includes("end of") || lowerStr.includes("end ") || 
      lowerStr === "reported above" || lowerStr.includes("inputed") ||
      lowerStr.length < 6) {
    return null;
  }
  
  // Try parsing various formats
  // Format: "Dec 17, 2024, 12:50:08 AM" or "Jan 8, 2025, 9:49:31 PM"
  let date = new Date(trimmed);
  if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
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
  
  // Format: "2/28/2025" with time "2/28/2025 1:15:18 AM"
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

// POST /api/reports/import - Import field work logs from CSV/JSON data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["ADMIN", "SUPERUSER"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { rows } = body as { rows: ImportRow[] };

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const row of rows) {
      try {
        // Skip rows with no location or if it's a header/summary row
        const locationLower = (row.location || "").toLowerCase().trim();
        if (!row.location || 
            locationLower.includes("end of") || 
            locationLower.includes("end ") ||
            locationLower === "reported above" ||
            locationLower.startsWith("also spent") ||
            locationLower.includes("paid $") ||
            locationLower.length < 3) {
          results.skipped++;
          continue;
        }

        // Skip rows that look like multi-line notes (often start with special characters or are too long without structure)
        if (row.location.startsWith('"') || row.location.startsWith("Also ") || row.location.startsWith("Paid ")) {
          results.skipped++;
          continue;
        }

        let parsedDate = parseDate(row.timestamp);
        if (!parsedDate) {
          // Try to parse the submittedBy field as a fallback (sometimes dates end up there)
          const fallbackDate = parseDate(row.submittedBy);
          if (fallbackDate) {
            // The date was in the wrong column
            parsedDate = fallbackDate;
            row.submittedBy = "";
          } else {
            // Try to find a date anywhere in the notes field
            const notesDate = row.notes ? parseDate(row.notes.trim()) : null;
            if (notesDate) {
              parsedDate = notesDate;
            } else {
              // Store for later with null date - we'll track these as "needs date"
              results.skipped++;
              // Only add to errors if it looks like a real entry (has workers or hours)
              if (row.workers || (row.hoursWorked && parseFloat(String(row.hoursWorked)) > 0)) {
                results.errors.push(`Missing date: ${row.location.substring(0, 30)}`);
              }
              continue;
            }
          }
        }

        const workers = parseWorkers(row.workers);

        // Check for duplicate (same date, location, and submitter)
        const dateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
        const existingLog = await prisma.fieldWorkLog.findFirst({
          where: {
            date: dateOnly,
            location: row.location.trim(),
            submittedBy: row.submittedBy?.replace(/^@/, "").trim() || "Unknown",
          },
        });

        if (existingLog) {
          results.skipped++;
          continue; // Skip duplicate, don't add to errors
        }

        await prisma.fieldWorkLog.create({
          data: {
            date: dateOnly,
            location: row.location.trim(),
            workersNames: workers,
            workerCount: parseNumber(row.workerCount) || workers.length || 0,
            hoursWorked: parseNumber(row.hoursWorked) || 0,
            strandHungFootage: parseNumber(row.strandHungFootage),
            polesAttached: parseNumber(row.polesAttached) as number | null,
            fiberLashedFootage: parseNumber(row.fiberLashedFootage),
            fiberPulledFootage: parseNumber(row.fiberPulledFootage),
            drilledFootage: parseNumber(row.drilledFootage),
            plowedFootage: parseNumber(row.plowedFootage),
            handholesPlaced: parseNumber(row.handholesPlaced) as number | null,
            vaultsPlaced: parseNumber(row.vaultsPlaced) as number | null,
            mstsInstalled: parseNumber(row.mstsInstalled) as number | null,
            guysPlaced: parseNumber(row.guysPlaced) as number | null,
            slackLoops: parseNumber(row.slackLoops) as number | null,
            risersInstalled: parseNumber(row.risersInstalled) as number | null,
            spliceCases: parseNumber(row.spliceCases) as number | null,
            notes: row.notes?.trim() || null,
            submittedBy: row.submittedBy?.replace(/^@/, "").trim() || "Unknown",
            originalTimestamp: parsedDate,
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push(`Error importing row: ${row.location} - ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    );
  }
}

// GET /api/reports/import - Get import template/info
export async function GET() {
  return NextResponse.json({
    template: {
      columns: [
        "location",
        "workers",
        "workerCount",
        "hoursWorked",
        "strandHungFootage",
        "polesAttached",
        "fiberLashedFootage",
        "fiberPulledFootage",
        "drilledFootage",
        "plowedFootage",
        "handholesPlaced",
        "vaultsPlaced",
        "mstsInstalled",
        "guysPlaced",
        "slackLoops",
        "risersInstalled",
        "spliceCases",
        "notes",
        "submittedBy",
        "timestamp",
      ],
      example: {
        location: "West Mountain Phase 1",
        workers: "@John Doe,@Jane Smith",
        workerCount: 2,
        hoursWorked: 8,
        strandHungFootage: 2500,
        polesAttached: 12,
        fiberLashedFootage: 1500,
        fiberPulledFootage: null,
        drilledFootage: null,
        plowedFootage: null,
        handholesPlaced: 2,
        vaultsPlaced: 1,
        mstsInstalled: 3,
        guysPlaced: 4,
        slackLoops: 2,
        risersInstalled: 1,
        spliceCases: 2,
        notes: "Completed strand installation on poles 1-12",
        submittedBy: "@John Doe",
        timestamp: "Jan 15, 2025, 5:00:00 PM",
      },
    },
  });
}

