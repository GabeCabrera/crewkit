import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Type for job data - matches JobPlanData from job-lifecycle-view
export interface JobReportData {
  id: string;
  jobName: string;
  jobNumber: string | null;
  locationName: string | null;
  locationAddress: string | null;
  status: string;
  // Planning
  totalDistance: number;
  strandFootage: number;
  fiberFootage: number;
  deadEnds: number;
  tangents: number;
  anchors: number;
  poleCount: number;
  // Construction Actuals
  actualFootage: number;
  actualPolesComplete: number;
  actualStrandUsed: number;
  actualFiberUsed: number;
  actualDeadEnds: number;
  actualTangents: number;
  actualAnchors: number;
  totalCrewHours: number;
  // Reporting
  foremanSignoff: boolean;
  signoffDate: string | null;
  lessonsLearned: string | null;
  completedAt: string | null;
}

export interface HoursLogData {
  id: string;
  date: string;
  userId: string;
  userName: string | null;
  hours: number;
  notes: string | null;
}

// ============================================
// PDF Helper Functions
// ============================================

/**
 * Adds a DRAFT watermark to the current page
 */
function addDraftWatermark(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.saveGraphicsState();
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  
  // Rotate and place watermark in center
  const text = "DRAFT";
  const textWidth = doc.getTextWidth(text);
  
  // Position in center of page, rotated -45 degrees
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  
  // Use text transformation for rotation
  doc.text(text, centerX - textWidth / 2, centerY, { 
    angle: -45,
  });
  
  doc.restoreGraphicsState();
}

/**
 * Adds standard header with timestamp and status to PDF
 */
function addPdfHeader(
  doc: jsPDF, 
  title: string, 
  job: JobReportData, 
  options: { includeStatus?: boolean } = {}
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const isDraft = !job.foremanSignoff;
  
  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 20, { align: "center" });

  // Job name
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(job.jobName, pageWidth / 2, 28, { align: "center" });
  
  // Location
  if (job.locationName) {
    doc.setFontSize(10);
    doc.text(job.locationName, pageWidth / 2, 34, { align: "center" });
  }

  // Status badge and timestamp line
  const statusY = job.locationName ? 44 : 38;
  doc.setFontSize(9);
  
  // Status indicator
  if (options.includeStatus !== false) {
    if (isDraft) {
      doc.setTextColor(180, 83, 9); // amber-600
      doc.setFont("helvetica", "bold");
      doc.text("[DRAFT]", 14, statusY);
    } else {
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.setFont("helvetica", "bold");
      doc.text("[FINAL]", 14, statusY);
    }
    doc.setFont("helvetica", "normal");
  }

  // Timestamp
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, statusY, { align: "right" });
  doc.setTextColor(0);

  return statusY + 8; // Return Y position for content to start
}

/**
 * Adds standard footer to all pages
 */
function addPdfFooter(doc: jsPDF, job: JobReportData): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isDraft = !job.foremanSignoff;
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    
    // Page number
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    
    // Job name on left
    doc.text(job.jobName, 14, pageHeight - 10);
    
    // Draft indicator on right
    if (isDraft) {
      doc.setTextColor(180, 83, 9);
      doc.text("DRAFT", pageWidth - 14, pageHeight - 10, { align: "right" });
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text("FINAL", pageWidth - 14, pageHeight - 10, { align: "right" });
    }
    
    doc.setTextColor(0);
  }
}

// ============================================
// CSV Generation Utilities
// ============================================

/**
 * Generates a CSV string from an array of objects
 */
export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return "";

  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      // Escape quotes and wrap in quotes if contains comma or newline
      const stringValue = value === null || value === undefined ? "" : String(value);
      if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generates CSV for As-Built comparison data
 */
export function generateAsBuiltCSV(job: JobReportData): string {
  const data = [
    { item: "Total Distance", planned: job.totalDistance, actual: job.actualFootage, unit: "ft" },
    { item: "Strand Footage", planned: job.strandFootage, actual: job.actualStrandUsed, unit: "ft" },
    { item: "Fiber Footage", planned: job.fiberFootage, actual: job.actualFiberUsed, unit: "ft" },
    { item: "Dead-ends", planned: job.deadEnds, actual: job.actualDeadEnds, unit: "count" },
    { item: "Tangents", planned: job.tangents, actual: job.actualTangents, unit: "count" },
    { item: "Anchors", planned: job.anchors, actual: job.actualAnchors, unit: "count" },
    { item: "Poles", planned: job.poleCount, actual: job.actualPolesComplete, unit: "count" },
  ];

  const csvData = data.map((row) => ({
    item: row.item,
    planned: `${row.planned} ${row.unit}`,
    actual: `${row.actual} ${row.unit}`,
    variance: row.actual - row.planned,
    variancePercent: row.planned > 0 
      ? `${(((row.actual - row.planned) / row.planned) * 100).toFixed(1)}%`
      : "N/A",
  }));

  return generateCSV(csvData, [
    { key: "item", header: "Item" },
    { key: "planned", header: "Planned" },
    { key: "actual", header: "As-Built" },
    { key: "variance", header: "Variance" },
    { key: "variancePercent", header: "Variance %" },
  ]);
}

/**
 * Generates CSV for completion summary data
 */
export function generateCompletionSummaryCSV(job: JobReportData): string {
  const progressPercent = job.totalDistance > 0 
    ? ((job.actualFootage / job.totalDistance) * 100).toFixed(1)
    : "0";

  const summaryData = [
    { metric: "Job Name", value: job.jobName },
    { metric: "Location", value: job.locationName || "N/A" },
    { metric: "Status", value: job.status },
    { metric: "Completion %", value: `${progressPercent}%` },
    { metric: "Total Planned Footage", value: `${job.totalDistance} ft` },
    { metric: "Total Actual Footage", value: `${job.actualFootage} ft` },
    { metric: "Footage Variance", value: `${job.actualFootage - job.totalDistance} ft` },
    { metric: "Poles Completed", value: String(job.actualPolesComplete) },
    { metric: "Total Crew Hours", value: String(job.totalCrewHours) },
    { metric: "Productivity (ft/hr)", value: job.totalCrewHours > 0 
      ? (job.actualFootage / job.totalCrewHours).toFixed(1) 
      : "N/A" 
    },
    { metric: "Signed Off", value: job.foremanSignoff ? "Yes" : "No" },
    { metric: "Sign-off Date", value: job.signoffDate 
      ? new Date(job.signoffDate).toLocaleDateString() 
      : "N/A" 
    },
  ];

  return generateCSV(summaryData, [
    { key: "metric", header: "Metric" },
    { key: "value", header: "Value" },
  ]);
}

/**
 * Generates CSV for hours summary data
 */
export function generateHoursSummaryCSV(
  job: JobReportData,
  logs: HoursLogData[]
): string {
  const csvData = logs.map((log) => ({
    date: new Date(log.date).toLocaleDateString(),
    crewMember: log.userName || log.userId,
    hours: log.hours,
    notes: log.notes || "",
  }));

  return generateCSV(csvData, [
    { key: "date", header: "Date" },
    { key: "crewMember", header: "Crew Member" },
    { key: "hours", header: "Hours" },
    { key: "notes", header: "Notes" },
  ]);
}

// ============================================
// PDF Generation Utilities
// ============================================

/**
 * Generates a PDF for As-Built comparison
 */
export function generateAsBuiltPDF(job: JobReportData): jsPDF {
  const doc = new jsPDF();
  const isDraft = !job.foremanSignoff;

  // Add header with status
  const startY = addPdfHeader(doc, "As-Built Comparison Report", job);

  // Add draft watermark if not signed off
  if (isDraft) {
    addDraftWatermark(doc);
  }

  // Comparison table
  const getStatus = (planned: number, actual: number, tolerance = 0.1): string => {
    if (planned === 0 && actual === 0) return "As Planned";
    if (planned === 0) return actual > 0 ? "Over" : "As Planned";
    const variance = Math.abs((actual - planned) / planned);
    if (variance <= tolerance) return "As Planned";
    return actual > planned ? "Over" : "Under";
  };

  const tableData = [
    ["Total Distance", `${job.totalDistance.toLocaleString()} ft`, `${job.actualFootage.toLocaleString()} ft`, getStatus(job.totalDistance, job.actualFootage)],
    ["Strand Footage", `${job.strandFootage.toLocaleString()} ft`, `${job.actualStrandUsed.toLocaleString()} ft`, getStatus(job.strandFootage, job.actualStrandUsed)],
    ["Fiber Footage", `${job.fiberFootage.toLocaleString()} ft`, `${job.actualFiberUsed.toLocaleString()} ft`, getStatus(job.fiberFootage, job.actualFiberUsed)],
    ["Dead-ends", String(job.deadEnds), String(job.actualDeadEnds), getStatus(job.deadEnds, job.actualDeadEnds, 0.2)],
    ["Tangents", String(job.tangents), String(job.actualTangents), getStatus(job.tangents, job.actualTangents, 0.2)],
    ["Anchors", String(job.anchors), String(job.actualAnchors), getStatus(job.anchors, job.actualAnchors, 0.2)],
    ["Poles", String(job.poleCount), String(job.actualPolesComplete), getStatus(job.poleCount, job.actualPolesComplete, 0.2)],
  ];

  autoTable(doc, {
    startY: startY,
    head: [["Item", "Planned", "As-Built", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "center" },
    },
  });

  // Footer note
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 150;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "Items are considered 'As Planned' if within 10% tolerance for footage and 20% for hardware counts.",
    14,
    finalY + 10
  );

  // Add footer to all pages
  addPdfFooter(doc, job);

  return doc;
}

/**
 * Generates a PDF for completion summary
 */
export function generateCompletionSummaryPDF(job: JobReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isDraft = !job.foremanSignoff;

  // Add header with status
  const startY = addPdfHeader(doc, "Job Completion Summary", job);

  // Add draft watermark if not signed off
  if (isDraft) {
    addDraftWatermark(doc);
  }

  // Progress section
  const progressPercent = job.totalDistance > 0 
    ? (job.actualFootage / job.totalDistance) * 100 
    : 0;

  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text(`${progressPercent.toFixed(0)}%`, pageWidth / 2, startY + 15, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Complete", pageWidth / 2, startY + 22, { align: "center" });

  // Summary metrics
  const summaryData = [
    ["Planned Footage", `${job.totalDistance.toLocaleString()} ft`],
    ["Actual Footage", `${job.actualFootage.toLocaleString()} ft`],
    ["Variance", `${(job.actualFootage - job.totalDistance).toLocaleString()} ft`],
    ["Poles Completed", String(job.actualPolesComplete)],
    ["Total Crew Hours", String(job.totalCrewHours)],
    ["Productivity", job.totalCrewHours > 0 ? `${(job.actualFootage / job.totalCrewHours).toFixed(1)} ft/hr` : "N/A"],
  ];

  autoTable(doc, {
    startY: startY + 32,
    body: summaryData,
    theme: "plain",
    bodyStyles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { halign: "right" },
    },
  });

  // Materials variance table
  const finalY1 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 140;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Materials Variance", 14, finalY1 + 15);

  const materialsData = [
    ["Strand", `${job.strandFootage.toLocaleString()} ft`, `${job.actualStrandUsed.toLocaleString()} ft`, `${(job.actualStrandUsed - job.strandFootage).toLocaleString()}`],
    ["Fiber", `${job.fiberFootage.toLocaleString()} ft`, `${job.actualFiberUsed.toLocaleString()} ft`, `${(job.actualFiberUsed - job.fiberFootage).toLocaleString()}`],
    ["Dead-ends", String(job.deadEnds), String(job.actualDeadEnds), String(job.actualDeadEnds - job.deadEnds)],
    ["Tangents", String(job.tangents), String(job.actualTangents), String(job.actualTangents - job.tangents)],
    ["Anchors", String(job.anchors), String(job.actualAnchors), String(job.actualAnchors - job.anchors)],
  ];

  autoTable(doc, {
    startY: finalY1 + 20,
    head: [["Material", "Planned", "Actual", "Variance"]],
    body: materialsData,
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
  });

  // Sign-off status
  const finalY2 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 200;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Sign-off Status", 14, finalY2 + 15);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  if (job.foremanSignoff) {
    doc.setTextColor(16, 185, 129);
    doc.text("SIGNED OFF", 14, finalY2 + 25);
    doc.setTextColor(0);
    if (job.signoffDate) {
      doc.text(`Date: ${new Date(job.signoffDate).toLocaleDateString()}`, 14, finalY2 + 32);
    }
  } else {
    doc.setTextColor(180, 83, 9);
    doc.text("PENDING SIGN-OFF", 14, finalY2 + 25);
    doc.setTextColor(0);
  }

  // Add footer to all pages
  addPdfFooter(doc, job);

  return doc;
}

/**
 * Generates a PDF for hours summary
 */
export function generateHoursSummaryPDF(
  job: JobReportData,
  logs: HoursLogData[]
): jsPDF {
  const doc = new jsPDF();
  const isDraft = !job.foremanSignoff;

  // Add header with status
  const startY = addPdfHeader(doc, "Hours Summary Report", job);

  // Add draft watermark if not signed off
  if (isDraft) {
    addDraftWatermark(doc);
  }

  // Summary metrics
  const crewCount = new Set(logs.map((log) => log.userName || log.userId)).size;
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const avgHoursPerPerson = crewCount > 0 ? totalHours / crewCount : 0;
  const productivityRate = job.totalCrewHours > 0 ? job.actualFootage / job.totalCrewHours : 0;

  const summaryData = [
    ["Total Hours", `${totalHours.toLocaleString()}`],
    ["Crew Members", String(crewCount)],
    ["Avg Hours/Person", avgHoursPerPerson.toFixed(1)],
    ["Productivity", `${productivityRate.toFixed(1)} ft/hr`],
  ];

  autoTable(doc, {
    startY: startY,
    body: summaryData,
    theme: "plain",
    bodyStyles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { halign: "right" },
    },
  });

  // Hours log table
  const finalY1 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 90;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Hours Log", 14, finalY1 + 15);

  const logData = logs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((log) => [
      new Date(log.date).toLocaleDateString(),
      log.userName || log.userId,
      `${log.hours} hrs`,
      log.notes || "-",
    ]);

  autoTable(doc, {
    startY: finalY1 + 20,
    head: [["Date", "Crew Member", "Hours", "Notes"]],
    body: logData,
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105], fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      3: { cellWidth: 60 },
    },
  });

  // Add footer to all pages
  addPdfFooter(doc, job);

  return doc;
}

/**
 * Generates a full job completion report PDF
 */
export function generateFullReportPDF(
  job: JobReportData,
  hoursLogs: HoursLogData[]
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isDraft = !job.foremanSignoff;

  // ============ Cover Page ============
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 80, "F");

  doc.setTextColor(255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("JOB COMPLETION REPORT", pageWidth / 2, 35, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(job.jobName, pageWidth / 2, 50, { align: "center" });

  if (job.locationName) {
    doc.setFontSize(12);
    doc.text(job.locationName, pageWidth / 2, 60, { align: "center" });
  }

  // Status badge on cover
  if (isDraft) {
    doc.setFillColor(180, 83, 9); // amber
    doc.roundedRect(pageWidth / 2 - 20, 65, 40, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(255);
    doc.text("DRAFT", pageWidth / 2, 72, { align: "center" });
  } else {
    doc.setFillColor(16, 185, 129); // emerald
    doc.roundedRect(pageWidth / 2 - 20, 65, 40, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(255);
    doc.text("FINAL", pageWidth / 2, 72, { align: "center" });
  }

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 95, { align: "center" });
  doc.text(`Job Number: ${job.jobNumber || "N/A"}`, pageWidth / 2, 102, { align: "center" });
  doc.text(`Status: ${job.status}`, pageWidth / 2, 109, { align: "center" });

  // Add watermark on cover if draft
  if (isDraft) {
    addDraftWatermark(doc);
  }

  // ============ Completion Summary Section ============
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Completion Summary", 14, 130);

  const progressPercent = job.totalDistance > 0 
    ? (job.actualFootage / job.totalDistance) * 100 
    : 0;

  const summaryData = [
    ["Progress", `${progressPercent.toFixed(0)}%`],
    ["Planned Footage", `${job.totalDistance.toLocaleString()} ft`],
    ["Actual Footage", `${job.actualFootage.toLocaleString()} ft`],
    ["Variance", `${(job.actualFootage - job.totalDistance).toLocaleString()} ft`],
    ["Poles Completed", String(job.actualPolesComplete)],
    ["Total Crew Hours", String(job.totalCrewHours)],
    ["Productivity", job.totalCrewHours > 0 ? `${(job.actualFootage / job.totalCrewHours).toFixed(1)} ft/hr` : "N/A"],
  ];

  autoTable(doc, {
    startY: 135,
    body: summaryData,
    theme: "plain",
    bodyStyles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { halign: "right" },
    },
  });

  // ============ As-Built Comparison Section ============
  doc.addPage();
  
  // Add watermark if draft
  if (isDraft) {
    addDraftWatermark(doc);
  }
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("As-Built Comparison", 14, 20);

  const getStatus = (planned: number, actual: number, tolerance = 0.1): string => {
    if (planned === 0 && actual === 0) return "As Planned";
    if (planned === 0) return actual > 0 ? "Over" : "As Planned";
    const variance = Math.abs((actual - planned) / planned);
    if (variance <= tolerance) return "As Planned";
    return actual > planned ? "Over" : "Under";
  };

  const asBuiltData = [
    ["Total Distance", `${job.totalDistance.toLocaleString()} ft`, `${job.actualFootage.toLocaleString()} ft`, getStatus(job.totalDistance, job.actualFootage)],
    ["Strand Footage", `${job.strandFootage.toLocaleString()} ft`, `${job.actualStrandUsed.toLocaleString()} ft`, getStatus(job.strandFootage, job.actualStrandUsed)],
    ["Fiber Footage", `${job.fiberFootage.toLocaleString()} ft`, `${job.actualFiberUsed.toLocaleString()} ft`, getStatus(job.fiberFootage, job.actualFiberUsed)],
    ["Dead-ends", String(job.deadEnds), String(job.actualDeadEnds), getStatus(job.deadEnds, job.actualDeadEnds, 0.2)],
    ["Tangents", String(job.tangents), String(job.actualTangents), getStatus(job.tangents, job.actualTangents, 0.2)],
    ["Anchors", String(job.anchors), String(job.actualAnchors), getStatus(job.anchors, job.actualAnchors, 0.2)],
    ["Poles", String(job.poleCount), String(job.actualPolesComplete), getStatus(job.poleCount, job.actualPolesComplete, 0.2)],
  ];

  autoTable(doc, {
    startY: 25,
    head: [["Item", "Planned", "As-Built", "Status"]],
    body: asBuiltData,
    theme: "striped",
    headStyles: { fillColor: [71, 85, 105], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "center" },
    },
  });

  // ============ Hours Summary Section ============
  const finalY1 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Hours Summary", 14, finalY1 + 20);

  const crewCount = new Set(hoursLogs.map((log) => log.userName || log.userId)).size;
  const totalHours = hoursLogs.reduce((sum, log) => sum + log.hours, 0);
  const productivityRate = job.totalCrewHours > 0 ? job.actualFootage / job.totalCrewHours : 0;

  const hoursData = [
    ["Total Hours", `${totalHours.toLocaleString()}`],
    ["Crew Members", String(crewCount)],
    ["Productivity", `${productivityRate.toFixed(1)} ft/hr`],
  ];

  autoTable(doc, {
    startY: finalY1 + 25,
    body: hoursData,
    theme: "plain",
    bodyStyles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { halign: "right" },
    },
  });

  // ============ Sign-off & Lessons Learned Section ============
  doc.addPage();

  // Add watermark if draft
  if (isDraft) {
    addDraftWatermark(doc);
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Sign-off Status", 14, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  const signoffStatus = job.foremanSignoff ? "SIGNED OFF" : "PENDING SIGN-OFF";
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(job.foremanSignoff ? 16 : 180, job.foremanSignoff ? 185 : 83, job.foremanSignoff ? 129 : 9);
  doc.text(signoffStatus, 14, 32);
  doc.setTextColor(0);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (job.signoffDate) {
    doc.text(`Date: ${new Date(job.signoffDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`, 14, 42);
  }

  // Lessons Learned
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Lessons Learned", 14, 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  if (job.lessonsLearned) {
    const splitText = doc.splitTextToSize(job.lessonsLearned, pageWidth - 28);
    doc.text(splitText, 14, 75);
  } else {
    doc.setTextColor(100);
    doc.text("No lessons learned recorded.", 14, 75);
    doc.setTextColor(0);
  }

  // ============ Footer on all pages ============
  addPdfFooter(doc, job);

  return doc;
}

// ============================================
// Download Utilities
// ============================================

/**
 * Downloads a file with the given content
 */
export function downloadFile(content: string | Blob, filename: string): void {
  const blob = typeof content === "string" 
    ? new Blob([content], { type: "text/csv;charset=utf-8;" })
    : content;

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a PDF document
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

/**
 * Generates a safe filename from job name
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================
// Monthly Report Types & Generation
// ============================================

export interface MonthlyReportData {
  month: string;
  dateRange: { start: string; end: string };
  executiveSummary: {
    month: string;
    dateRange: { start: string; end: string };
    inventory: {
      itemsUsed: number;
      totalCost: number;
      topItems: Array<{
        equipment: { name: string; sku: string };
        totalQuantity: number;
        totalCost: number;
      }>;
    };
    fieldWork: {
      totalLogs: number;
      totalHours: number;
      totalFootage: number;
      uniqueWorkers: number;
    };
    assemblies: {
      totalUsed: number;
      uniqueTypes: number;
    };
    jobs: {
      total: number;
      completed: number;
      inProgress: number;
    };
  };
  inventoryUsage: Array<{
    equipment: {
      id: string;
      name: string;
      sku: string;
      pricePerUnit: number;
      unitType: string;
    };
    totalQuantity: number;
    totalCost: number;
    usageCount: number;
  }>;
  stockComparison: Array<{
    equipment: {
      id: string;
      name: string;
      sku: string;
      unitType: string;
    };
    currentQuantity: number;
    startOfMonthQuantity: number;
    change: number;
    changePercent: string;
  }>;
  fieldWorkSummary: {
    totalLogs: number;
    totalHoursWorked: number;
    uniqueWorkers: number;
    aerial: {
      strandHungFootage: number;
      polesAttached: number;
      fiberLashedFootage: number;
      fiberPulledFootage: number;
    };
    underground: {
      drilledFootage: number;
      plowedFootage: number;
      trenchedFootage: number;
      conduitPlacedFootage: number;
    };
    infrastructure: {
      handholesPlaced: number;
      vaultsPlaced: number;
      mstsInstalled: number;
      guysPlaced: number;
      slackLoops: number;
      risersInstalled: number;
      spliceCases: number;
      anchorsPlaced: number;
      snowshoesPlaced: number;
    };
  };
  derivedUsage?: Array<{
    name: string;
    quantity: number;
    sourceFootage?: number;
    formula?: string;
  }>;
  fieldLogs: Array<{
    id: string;
    date: string;
    location: string;
    workersNames: string[];
    workerCount: number;
    hoursWorked: number;
    submittedBy: string;
    team: { id: string; name: string } | null;
    jobPlan: { id: string; jobName: string; jobNumber: string | null } | null;
    aerial: {
      strandHungFootage: number | null;
      polesAttached: number | null;
      fiberLashedFootage: number | null;
      fiberPulledFootage: number | null;
    };
    underground: {
      drilledFootage: number | null;
      plowedFootage: number | null;
      trenchedFootage: number | null;
      conduitPlacedFootage: number | null;
    };
    infrastructure: {
      handholesPlaced: number | null;
      vaultsPlaced: number | null;
      mstsInstalled: number | null;
      guysPlaced: number | null;
    };
    notes: string | null;
    issues: string | null;
  }>;
  assemblyUsage: Array<{
    assembly: {
      id: string;
      name: string;
      description: string | null;
      category: { name: string } | null;
      type: { name: string } | null;
    };
    totalQuantity: number;
    usageCount: number;
  }>;
  jobProgress: Array<{
    id: string;
    jobName: string;
    jobNumber: string | null;
    locationName: string | null;
    status: string;
    totalDistance: number;
    actualFootage: number;
    poleCount: number;
    actualPolesComplete: number;
    totalCrewHours: number;
    foremanSignoff: boolean;
    progressPercent: number;
    poleProgress: number;
  }>;
}

/**
 * Generates a comprehensive monthly report PDF
 */
export function generateMonthlyReportPDF(data: MonthlyReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ============ COVER PAGE ============
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setTextColor(255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("MONTHLY REPORT", pageWidth / 2, 35, { align: "center" });

  doc.setFontSize(20);
  doc.setFont("helvetica", "normal");
  doc.text(data.month, pageWidth / 2, 55, { align: "center" });

  doc.setFontSize(12);
  doc.text(
    `${data.dateRange.start} - ${data.dateRange.end}`,
    pageWidth / 2,
    70,
    { align: "center" }
  );

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 105, {
    align: "center",
  });

  // ============ EXECUTIVE SUMMARY ============
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, 125);

  const { executiveSummary: summary } = data;

  // Key metrics in a grid
  const summaryData = [
    ["Field Work", `${summary.fieldWork.totalLogs} logs | ${summary.fieldWork.totalHours.toLocaleString()} hrs | ${summary.fieldWork.totalFootage.toLocaleString()} ft`],
    ["Unique Workers", String(summary.fieldWork.uniqueWorkers)],
    ["Assemblies Used", `${summary.assemblies.totalUsed} (${summary.assemblies.uniqueTypes} types)`],
    ["Inventory Cost", `$${summary.inventory.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ["Jobs", `${summary.jobs.total} total | ${summary.jobs.completed} completed | ${summary.jobs.inProgress} in progress`],
  ];

  autoTable(doc, {
    startY: 130,
    body: summaryData,
    theme: "plain",
    bodyStyles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { halign: "left" },
    },
  });

  // ============ INVENTORY (Usage + Stock) ============
  doc.addPage();
  addMonthlyPageHeader(doc, "Inventory", data.month);

  let invY = 35;

  // Equipment usage this month
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Equipment usage this month", 14, invY);
  invY += 8;

  // Build equipment table data including derived usage
  const derivedRows = (data.derivedUsage ?? [])
    .filter((d) => d.quantity > 0)
    .map((item) => [
      `${item.name} (calculated)`,
      item.formula || "-",
      item.quantity.toLocaleString(),
      "-",
    ]);

  const inventoryTableData = [
    ...data.inventoryUsage.slice(0, 18).map((item) => [
      item.equipment.name,
      item.equipment.sku,
      item.totalQuantity.toLocaleString(),
      `$${item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]),
    ...derivedRows,
  ];

  if (inventoryTableData.length > 0) {
    autoTable(doc, {
      startY: invY,
      head: [["Equipment", "SKU", "Qty Used", "Cost"]],
      body: inventoryTableData,
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    invY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? invY + 40;
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("No equipment usage recorded this month.", 14, invY);
    doc.setTextColor(0);
    invY += 12;
  }

  invY += 10;

  // Stock level changes
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Stock level changes", 14, invY);
  invY += 8;

  if (data.stockComparison.length > 0) {
    const stockTableData = data.stockComparison.slice(0, 18).map((item) => [
      item.equipment.name,
      item.equipment.sku,
      item.startOfMonthQuantity.toLocaleString(),
      item.currentQuantity.toLocaleString(),
      (item.change >= 0 ? "+" : "") + item.change.toLocaleString(),
      item.changePercent + "%",
    ]);

    autoTable(doc, {
      startY: invY,
      head: [["Equipment", "SKU", "Start", "Current", "Change", "% Change"]],
      body: stockTableData,
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("No stock level changes this month.", 14, invY);
    doc.setTextColor(0);
  }

  // ============ FIELD WORK SUMMARY ============
  doc.addPage();
  addMonthlyPageHeader(doc, "Field Work Summary", data.month);

  const { fieldWorkSummary: fw } = data;

  // Aerial work
  let currentY = 35;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Aerial Construction", 14, currentY + 15);

  const aerialData = [
    ["Strand Hung", `${fw.aerial.strandHungFootage.toLocaleString()} ft`],
    ["Poles Attached", String(fw.aerial.polesAttached)],
    ["Fiber Lashed", `${fw.aerial.fiberLashedFootage.toLocaleString()} ft`],
    ["Fiber Pulled", `${fw.aerial.fiberPulledFootage.toLocaleString()} ft`],
  ];

  autoTable(doc, {
    startY: currentY + 20,
    body: aerialData,
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right" },
    },
  });

  // Underground work
  currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 130;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Underground Construction", 14, currentY + 15);

  const ugData = [
    ["Drilled", `${fw.underground.drilledFootage.toLocaleString()} ft`],
    ["Plowed", `${fw.underground.plowedFootage.toLocaleString()} ft`],
    ["Trenched", `${fw.underground.trenchedFootage.toLocaleString()} ft`],
    ["Conduit Placed", `${fw.underground.conduitPlacedFootage.toLocaleString()} ft`],
  ];

  autoTable(doc, {
    startY: currentY + 20,
    body: ugData,
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right" },
    },
  });

  // Infrastructure
  currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 180;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Infrastructure", 14, currentY + 15);

  const infraData = [
    ["Handholes", String(fw.infrastructure.handholesPlaced)],
    ["Vaults", String(fw.infrastructure.vaultsPlaced)],
    ["MSTs Installed", String(fw.infrastructure.mstsInstalled)],
    ["Guys Placed", String(fw.infrastructure.guysPlaced)],
    ["Slack Loops", String(fw.infrastructure.slackLoops)],
    ["Risers", String(fw.infrastructure.risersInstalled)],
    ["Splice Cases", String(fw.infrastructure.spliceCases)],
    ["Anchors", String(fw.infrastructure.anchorsPlaced)],
  ];

  autoTable(doc, {
    startY: currentY + 20,
    body: infraData,
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right" },
    },
  });

  // ============ ASSEMBLY USAGE ============
  doc.addPage();
  addMonthlyPageHeader(doc, "Assembly Usage", data.month);

  if (data.assemblyUsage.length > 0) {
    const assemblyTableData = data.assemblyUsage.slice(0, 30).map((item) => [
      item.assembly.name,
      item.assembly.category?.name || "-",
      item.assembly.type?.name || "-",
      item.totalQuantity.toLocaleString(),
      String(item.usageCount),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Assembly", "Category", "Type", "Qty Used", "Times Used"]],
      body: assemblyTableData,
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("No assembly usage recorded this month.", 14, 45);
    doc.setTextColor(0);
  }

  // ============ JOB PROGRESS ============
  doc.addPage();
  addMonthlyPageHeader(doc, "Job Progress", data.month);

  if (data.jobProgress.length > 0) {
    const jobTableData = data.jobProgress.slice(0, 25).map((job) => [
      job.jobName,
      job.locationName?.substring(0, 20) || "-",
      job.status.replace("_", " "),
      `${job.progressPercent}%`,
      `${job.actualFootage.toLocaleString()} / ${job.totalDistance.toLocaleString()} ft`,
      `${job.actualPolesComplete} / ${job.poleCount}`,
      job.foremanSignoff ? "Yes" : "No",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Job Name", "Location", "Status", "Progress", "Footage", "Poles", "Signed"]],
      body: jobTableData,
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        3: { halign: "center" },
        6: { halign: "center" },
      },
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("No job activity this month.", 14, 45);
    doc.setTextColor(0);
  }

  // ============ ADD FOOTERS TO ALL PAGES ============
  addMonthlyReportFooter(doc, data.month);

  return doc;
}

/**
 * Adds a header to monthly report pages
 */
function addMonthlyPageHeader(doc: jsPDF, title: string, month: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(month, pageWidth - 14, 20, { align: "right" });
  doc.setTextColor(0);

  // Divider line
  doc.setDrawColor(200);
  doc.line(14, 25, pageWidth - 14, 25);
}

/**
 * Adds footers to all pages of monthly report
 */
function addMonthlyReportFooter(doc: jsPDF, month: string): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);

    // Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });

    // Month on left
    doc.text(`Monthly Report - ${month}`, 14, pageHeight - 10);

    // Generated date on right
    doc.text(
      new Date().toLocaleDateString(),
      pageWidth - 14,
      pageHeight - 10,
      { align: "right" }
    );

    doc.setTextColor(0);
  }
}

/**
 * Generates CSV for monthly inventory usage
 */
export function generateMonthlyInventoryCSV(data: MonthlyReportData): string {
  const csvData = data.inventoryUsage.map((item) => ({
    name: item.equipment.name,
    sku: item.equipment.sku,
    unitType: item.equipment.unitType,
    quantityUsed: item.totalQuantity,
    cost: item.totalCost.toFixed(2),
    usageCount: item.usageCount,
  }));

  const derivedWithQty = data.derivedUsage?.filter((d) => d.quantity > 0) ?? [];
  derivedWithQty.forEach((item) => {
    csvData.push({
      name: item.name,
      sku: "-",
      unitType: "-",
      quantityUsed: item.quantity,
      cost: "0.00",
      usageCount: 0,
    });
  });

  return generateCSV(csvData, [
    { key: "name", header: "Equipment Name" },
    { key: "sku", header: "SKU" },
    { key: "unitType", header: "Unit Type" },
    { key: "quantityUsed", header: "Quantity Used" },
    { key: "cost", header: "Total Cost ($)" },
    { key: "usageCount", header: "Usage Count" },
  ]);
}

/**
 * Generates CSV for monthly field logs
 */
export function generateMonthlyFieldLogsCSV(data: MonthlyReportData): string {
  const csvData = data.fieldLogs.map((log) => ({
    date: new Date(log.date).toLocaleDateString(),
    location: log.location,
    workers: log.workersNames.join("; "),
    workerCount: log.workerCount,
    hoursWorked: log.hoursWorked,
    submittedBy: log.submittedBy,
    jobName: log.jobPlan?.jobName || "",
    strandHung: log.aerial.strandHungFootage || 0,
    polesAttached: log.aerial.polesAttached || 0,
    fiberLashed: log.aerial.fiberLashedFootage || 0,
    drilledFootage: log.underground.drilledFootage || 0,
    conduitPlaced: log.underground.conduitPlacedFootage || 0,
    notes: log.notes || "",
    issues: log.issues || "",
  }));

  return generateCSV(csvData, [
    { key: "date", header: "Date" },
    { key: "location", header: "Location" },
    { key: "workers", header: "Workers" },
    { key: "workerCount", header: "Crew Size" },
    { key: "hoursWorked", header: "Hours" },
    { key: "submittedBy", header: "Submitted By" },
    { key: "jobName", header: "Job" },
    { key: "strandHung", header: "Strand (ft)" },
    { key: "polesAttached", header: "Poles" },
    { key: "fiberLashed", header: "Fiber Lashed (ft)" },
    { key: "drilledFootage", header: "Drilled (ft)" },
    { key: "conduitPlaced", header: "Conduit (ft)" },
    { key: "notes", header: "Notes" },
    { key: "issues", header: "Issues" },
  ]);
}
