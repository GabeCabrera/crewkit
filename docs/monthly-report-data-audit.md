# Monthly Report – Data Audit Guide

This document describes how the **monthly report** (PDF/CSV) gets its data from the database, what “missing” or “incomplete” means for each source, and how to audit a given month so you can see what’s missing and fix it.

---

## 1. What the monthly report uses

The monthly report aggregates five areas of data for a **single calendar month** (e.g. February 2026). Date range is always **first day of month 00:00:00** through **last day of month 23:59:59**.

| # | Data source | Table(s) | Used for |
|---|-------------|----------|----------|
| 1 | Equipment usage | `EquipmentLog` | “Inventory usage” (what was used and cost); feeds executive summary “Inventory cost” |
| 2 | Stock levels | `Inventory` + `EquipmentLog` (month) | “Stock level changes” (start vs current qty, change %) |
| 3 | Field work | `FieldWorkLog` | “Field work summary” (hours, footage, poles, infrastructure); executive summary field metrics; CSV “Field logs” |
| 4 | Assembly usage | `AssemblyUsageLog` | “Assembly usage” section; executive summary “Assemblies used” |
| 5 | Job progress | `JobPlan` | “Job progress” section; executive summary “Jobs” (total / completed / in progress) |

Below we go through each source, what the report expects, what “missing” means, and how to check it.

---

## 2. Field work logs (`FieldWorkLog`)

**Date filter:** `date` within the month (inclusive).

**What the report uses:**

- **Count / people:** `workersNames` (array), `workerCount`, `hoursWorked`, `submittedBy`, `location`, `teamId`, `jobPlanId`
- **Aerial (footage/counts):** `strandHungFootage`, `polesAttached`, `fiberLashedFootage`, `fiberPulledFootage`
- **Underground (footage):** `drilledFootage`, `plowedFootage`, `trenchedFootage`, `conduitPlacedFootage`
- **Infrastructure (counts):** `handholesPlaced`, `vaultsPlaced`, `mstsInstalled`, `guysPlaced`, `slackLoops`, `risersInstalled`, `spliceCases`, `anchorsPlaced`, `snowshoesPlaced`

**What “missing” or “incomplete” means:**

- **No logs for the month** → Field work summary and executive field metrics will be zeros.
- **Logs with no metrics:** Every numeric field above is optional (nullable). If a log has only `date`/`location`/`submittedBy` and all construction fields are null, it still counts as “one log” and “unique workers” from `workersNames`, but all footage/poles/infrastructure for that log contribute 0. So:
  - **Missing hours:** `hoursWorked` null or 0 → total hours for the month will be understated.
  - **Missing workers:** `workersNames` empty and/or `workerCount` 0 → “Unique workers” can be understated.
  - **Missing construction data:** All aerial/underground/infrastructure fields null → that log adds nothing to the Field Work Summary numbers (footage, poles, handholes, etc.).
- **Missing link to job:** `jobPlanId` null → log is still included in the report and in CSV, but not tied to a specific job in the export.
- **Missing team:** `teamId` null → log is still included; team just won’t show in CSV/detail.

**How to audit for month YYYY-MM (e.g. 2026-02):**

Run these checks (replace `2026` and `2` with your year and month):

```sql
-- Count of field logs in the month
SELECT COUNT(*) AS log_count
FROM "FieldWorkLog"
WHERE date >= DATE '2026-02-01' AND date <= DATE '2026-02-29';

-- Logs with no hours
SELECT id, date, location, "submittedBy", "hoursWorked", "workerCount"
FROM "FieldWorkLog"
WHERE date >= DATE '2026-02-01' AND date <= DATE '2026-02-29'
  AND ( "hoursWorked" IS NULL OR "hoursWorked" = 0 );

-- Logs with no workers listed
SELECT id, date, location, "submittedBy", "workersNames", "workerCount"
FROM "FieldWorkLog"
WHERE date >= DATE '2026-02-01' AND date <= DATE '2026-02-29'
  AND ( "workersNames" = '{}' OR "workerCount" = 0 );

-- Logs with zero construction data (all aerial/underground/infra null or zero)
SELECT id, date, location, "submittedBy"
FROM "FieldWorkLog"
WHERE date >= DATE '2026-02-01' AND date <= DATE '2026-02-29'
  AND ( "strandHungFootage" IS NULL OR "strandHungFootage" = 0 )
  AND ( "polesAttached" IS NULL OR "polesAttached" = 0 )
  AND ( "fiberLashedFootage" IS NULL OR "fiberLashedFootage" = 0 )
  AND ( "fiberPulledFootage" IS NULL OR "fiberPulledFootage" = 0 )
  AND ( "drilledFootage" IS NULL OR "drilledFootage" = 0 )
  AND ( "plowedFootage" IS NULL OR "plowedFootage" = 0 )
  AND ( "trenchedFootage" IS NULL OR "trenchedFootage" = 0 )
  AND ( "conduitPlacedFootage" IS NULL OR "conduitPlacedFootage" = 0 )
  AND ( "handholesPlaced" IS NULL OR "handholesPlaced" = 0 )
  AND ( "vaultsPlaced" IS NULL OR "vaultsPlaced" = 0 )
  AND ( "mstsInstalled" IS NULL OR "mstsInstalled" = 0 )
  AND ( "guysPlaced" IS NULL OR "guysPlaced" = 0 )
  AND ( "slackLoops" IS NULL OR "slackLoops" = 0 )
  AND ( "risersInstalled" IS NULL OR "risersInstalled" = 0 )
  AND ( "spliceCases" IS NULL OR "spliceCases" = 0 )
  AND ( "anchorsPlaced" IS NULL OR "anchorsPlaced" = 0 )
  AND ( "snowshoesPlaced" IS NULL OR "snowshoesPlaced" = 0 );

-- Logs not linked to a job
SELECT id, date, location, "submittedBy", "jobPlanId"
FROM "FieldWorkLog"
WHERE date >= DATE '2026-02-01' AND date <= DATE '2026-02-29'
  AND "jobPlanId" IS NULL;
```

**What to do:**  
- If “no hours” or “no workers” rows are wrong, backfill `hoursWorked` / `workersNames` / `workerCount` from your source (timesheets, EOD forms, etc.).  
- If “zero construction data” logs are real work days, add the correct aerial/underground/infrastructure numbers so the Field Work Summary reflects actual work.  
- Optionally set `jobPlanId` where the work clearly belongs to a job so the CSV and future reports are clearer.

---

## 3. Equipment usage and stock (“Inventory” in the report)

**Equipment usage (what was used this month):**

- **Source:** `EquipmentLog` where `type` is `'USED'` or `'REMOVE'` and `date` is in the month.
- **Uses:** `equipmentId`, `quantity` (absolute value), and `equipment.pricePerUnit` for cost.
- **Missing:** No rows for the month → “Inventory usage” and “Inventory cost” in the executive summary will be empty/zero. If equipment has no `pricePerUnit`, cost for that item is 0.

**Stock level changes:**

- **Source:** Current `Inventory` rows, plus `EquipmentLog` for the month (all types) grouped by `equipmentId` to get net change. “Start of month” = current quantity minus that net change.
- **Missing:** Only items with **nonzero change** appear in “Stock level changes”. If you expect movement but don’t see it, either there are no `EquipmentLog` rows for that equipment in the month, or `Inventory` doesn’t have that equipment.

**How to audit for the month:**

```sql
-- Equipment usage (USED/REMOVE) in the month
SELECT e.name, e.sku, el.type, SUM(ABS(el.quantity)) AS qty, e."pricePerUnit"
FROM "EquipmentLog" el
JOIN "Equipment" e ON e.id = el."equipmentId"
WHERE el.date >= '2026-02-01' AND el.date <= '2026-02-29 23:59:59'
  AND el.type IN ('USED', 'REMOVE')
GROUP BY e.id, e.name, e.sku, el.type, e."pricePerUnit";

-- Equipment with no price (cost will show as 0)
SELECT e.id, e.name, e.sku, e."pricePerUnit"
FROM "Equipment" e
JOIN "EquipmentLog" el ON el."equipmentId" = e.id
WHERE el.date >= '2026-02-01' AND el.date <= '2026-02-29 23:59:59'
  AND el.type IN ('USED', 'REMOVE')
  AND ( e."pricePerUnit" IS NULL OR e."pricePerUnit" = 0 );
```

**What to do:**  
- Add or correct `EquipmentLog` entries for the month so usage matches reality.  
- Set `pricePerUnit` on `Equipment` where you want cost to show in the report.

---

## 4. Assembly usage (`AssemblyUsageLog`)

**Date filter:** `date` within the month.

**What the report uses:** `assemblyId`, `quantity`, and the assembly’s `name`, `category`, `type`.

**Missing:** No rows for the month → “Assembly usage” and executive “Assemblies used” will be empty/zero. Each row must have a valid `assemblyId` (and the assembly should have category/type if you want them in the report).

**How to audit:**

```sql
-- Assembly usage count for the month
SELECT COUNT(*) AS usage_count,
       SUM(quantity) AS total_quantity
FROM "AssemblyUsageLog"
WHERE date >= '2026-02-01' AND date <= '2026-02-29 23:59:59';

-- List assemblies used
SELECT a.name, ac.name AS category, at.name AS type, SUM(aul.quantity) AS qty
FROM "AssemblyUsageLog" aul
JOIN "Assembly" a ON a.id = aul."assemblyId"
LEFT JOIN "AssemblyCategory" ac ON ac.id = a."categoryId"
LEFT JOIN "AssemblyType" at ON at.id = a."typeId"
WHERE aul.date >= '2026-02-01' AND aul.date <= '2026-02-29 23:59:59'
GROUP BY a.id, a.name, ac.name, at.name;
```

**What to do:**  
- If you expect assembly usage but see none, ensure field users are logging assembly use in the app for that month, and that `date` on each log is correct.

---

## 5. Job progress (`JobPlan`)

**Filter:** Jobs where **either** `status` is `IN_PROGRESS` or `COMPLETED`, **or** `updatedAt` falls in the month. So the report includes active/completed jobs plus any job touched that month.

**What the report uses:** `jobName`, `jobNumber`, `locationName`, `status`, `totalDistance`, `actualFootage`, `poleCount`, `actualPolesComplete`, `totalCrewHours`, `foremanSignoff`, etc., to show progress % and pole progress.

**Missing:**  
- No jobs matching the filter → “Job progress” and executive “Jobs” will be empty or minimal.  
- `actualFootage` / `actualPolesComplete` / `totalCrewHours` not updated from field logs or daily logs → progress and “total crew hours” in the report will be wrong.

**How to audit:**

```sql
-- Jobs included in the monthly report for the month (active or updated in month)
SELECT id, "jobName", "jobNumber", status, "totalDistance", "actualFootage",
       "poleCount", "actualPolesComplete", "totalCrewHours", "foremanSignoff", "updatedAt"
FROM "JobPlan"
WHERE status IN ('IN_PROGRESS', 'COMPLETED')
   OR ( "updatedAt" >= '2026-02-01' AND "updatedAt" <= '2026-02-29 23:59:59' )
ORDER BY "updatedAt" DESC;
```

**What to do:**  
- Confirm that job progress (e.g. `actualFootage`, `actualPolesComplete`, `totalCrewHours`) is being updated from field logs or from your daily progress/crew hours entry so the monthly “Job progress” section matches reality.

---

## 6. Quick checklist for “what are we missing?”

Use this for a single month (e.g. February 2026):

1. **Field logs**
   - [ ] Run “Count of field logs in the month”. If 0, you have no field activity in the report for that month.
   - [ ] Run “Logs with no hours” and “Logs with no workers”. Fix or backfill so totals and unique workers are correct.
   - [ ] Run “Logs with zero construction data”. If real work is missing, add the aerial/underground/infrastructure numbers.
   - [ ] Optionally fix “Logs not linked to a job” so the CSV and reporting are clearer.

2. **Equipment / inventory**
   - [ ] Run “Equipment usage (USED/REMOVE) in the month”. If empty, the report will show no usage and no inventory cost.
   - [ ] Run “Equipment with no price” and set `pricePerUnit` where you want cost to appear.

3. **Assembly usage**
   - [ ] Run “Assembly usage count” and “List assemblies used”. If 0, no assembly usage will show; ensure usage is being logged in the app for that month.

4. **Job progress**
   - [ ] Run “Jobs included in the monthly report”. Confirm the list is what you expect and that `actualFootage` / `actualPolesComplete` / `totalCrewHours` are updated from the field.

---

## 7. Running the queries

- **Option A:** Use your PostgreSQL client (psql, DBeaver, etc.) with `DATABASE_URL` or your DB connection. Replace `2026-02-01` / `2026-02-29` with your month.
- **Option B:** Use Prisma Studio (`npx prisma studio`) and filter by date manually; the SQL above gives you exact queries to replicate.
- **Option C:** Add a small script in `scripts/` that uses Prisma to run these checks for a `MONTH=YYYY-MM` env var and print counts; you can do that later if you want to automate.

After you fix missing or incorrect data, re-run the monthly report (same month) to confirm the PDF and CSV look correct.
