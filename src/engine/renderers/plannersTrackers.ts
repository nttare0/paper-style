import { svgCircle, svgLine, svgRect, svgText } from "../svgHelpers";
import type { RenderContext } from "./types";

function drawLinesInBox(
  x: number,
  y: number,
  w: number,
  bottom: number,
  step: number,
  color: string,
  sw: number,
  withCheckboxes = false,
): string {
  const out: string[] = [];
  for (let ly = y + step; ly <= bottom - 1.5; ly += step) {
    if (withCheckboxes) {
      out.push(svgRect(x + 1, ly - 3.3, 3, 3, { stroke: color, strokeWidth: sw }));
      out.push(svgLine(x + 6, ly, x + w - 1, ly, { stroke: color, width: sw * 0.85 }));
    } else {
      out.push(svgLine(x + 1, ly, x + w - 1, ly, { stroke: color, width: sw * 0.85 }));
    }
  }
  return out.join("");
}

export function renderDailyPlanner(ctx: RenderContext): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  const headerH = 14;
  out.push(svgText(box.x, box.y + 6, "DAILY PLANNER", { fill: accentColor, sizeMm: 4.2, weight: "700" }));
  out.push(svgText(box.x + 42, box.y + 6, "DAY:  M  T  W  T  F  S  S", { fill: textColor, sizeMm: 3, weight: "600" }));
  out.push(svgLine(box.x, box.y + headerH - 3, box.right, box.y + headerH - 3, { stroke: accentColor, width: sw * 1.6 }));

  const bodyY = box.y + headerH;
  const bodyH = box.bottom - bodyY;
  const leftW = box.width * 0.56;
  const gap = 5;
  const rightX = box.x + leftW + gap;
  const rightW = box.width - leftW - gap;

  // Hourly schedule on left (6:00 - 21:00)
  out.push(svgRect(box.x, bodyY, leftW, bodyH, { stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(box.x + 3, bodyY + 5, "TIME SCHEDULE", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  const hours = 16;
  const schedTop = bodyY + 8;
  const rowH = (bodyH - 8) / hours;
  for (let h = 0; h < hours; h++) {
    const ry = schedTop + h * rowH;
    out.push(svgLine(box.x, ry, box.x + leftW, ry, { stroke: lineColor, width: sw * 0.8 }));
    out.push(svgText(box.x + 2.5, ry + rowH * 0.65, `${String(h + 6).padStart(2, "0")}:00`, { fill: textColor, sizeMm: 2.4, weight: "600" }));
    out.push(svgLine(box.x + 14, ry, box.x + 14, ry + rowH, { stroke: lineColor, width: sw * 0.7 }));
  }

  // Right column: Top Priorities + To-Do + Notes
  const priH = bodyH * 0.25;
  const todoH = bodyH * 0.42;
  const notesY = bodyY + priH + todoH + 8;
  const notesH = Math.max(12, box.bottom - notesY);

  out.push(svgRect(rightX, bodyY, rightW, priH, { stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(rightX + 3, bodyY + 5, "TOP 3 PRIORITIES", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  out.push(drawLinesInBox(rightX + 2, bodyY + 7, rightW - 4, bodyY + priH, Math.max(7, (priH - 10) / 3), lineColor, sw, true));

  const todoY = bodyY + priH + 4;
  out.push(svgRect(rightX, todoY, rightW, todoH, { stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(rightX + 3, todoY + 5, "TO-DO LIST", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  out.push(drawLinesInBox(rightX + 2, todoY + 7, rightW - 4, todoY + todoH, 7, lineColor, sw, true));

  out.push(svgRect(rightX, notesY, rightW, notesH, { stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(rightX + 3, notesY + 5, "NOTES & GRATITUDE", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  out.push(drawLinesInBox(rightX + 2, notesY + 7, rightW - 4, box.bottom, 7, lineColor, sw, false));

  return out.join("");
}

export function renderWeeklyPlanner(ctx: RenderContext): string {
  const { settings, geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY", "WEEKLY NOTES"];
  const cols = 2;
  const rows = 4;
  const gap = 5;
  const cellW = (box.width - gap) / cols;
  const cellH = (box.height - gap * (rows - 1)) / rows;
  const step = Math.max(5.5, Math.min(9, settings.lineSpacingMm));
  const out: string[] = [];

  for (let i = 0; i < days.length; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = box.x + c * (cellW + gap);
    const y = box.y + r * (cellH + gap);
    out.push(svgRect(x, y, cellW, cellH, { stroke: accentColor, strokeWidth: sw * 1.3, rx: 1.5 }));
    out.push(svgRect(x, y, cellW, 7, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw }));
    out.push(svgText(x + 3, y + 5, days[i]!, { fill: accentColor, sizeMm: 2.9, weight: "700" }));
    out.push(drawLinesInBox(x + 2, y + 8, cellW - 4, y + cellH, step, lineColor, sw));
  }
  return out.join("");
}

export function renderMonthlyCalendar(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  const headerH = 14;
  out.push(svgText(box.x, box.y + 6, "MONTH: ________________________", { fill: accentColor, sizeMm: 3.6, weight: "700" }));
  out.push(svgText(box.right, box.y + 6, "YEAR: ________", { fill: accentColor, sizeMm: 3.6, anchor: "end", weight: "700" }));

  const notesW = box.width * 0.18;
  const calW = box.width - notesW - 4;
  const calTop = box.y + headerH;
  const calH = box.bottom - calTop;
  const cols = 7;
  const rows = 5;
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const colHeadH = 7;
  const cellW = calW / cols;
  const cellH = (calH - colHeadH) / rows;

  out.push(svgRect(box.x, calTop, calW, calH, { stroke: accentColor, strokeWidth: sw * 1.4 }));
  for (let c = 0; c < cols; c++) {
    const cx = box.x + c * cellW;
    out.push(svgRect(cx, calTop, cellW, colHeadH, { fill: accentColor, fillOpacity: 0.1, stroke: lineColor, strokeWidth: sw }));
    out.push(svgText(cx + cellW / 2, calTop + 4.8, dayNames[c]!, { fill: accentColor, sizeMm: 2.6, anchor: "middle", weight: "700" }));
    if (c > 0) out.push(svgLine(cx, calTop + colHeadH, cx, box.bottom, { stroke: lineColor, width: sw }));
  }
  for (let r = 1; r < rows; r++) {
    const ry = calTop + colHeadH + r * cellH;
    out.push(svgLine(box.x, ry, box.x + calW, ry, { stroke: lineColor, width: sw }));
  }

  // Notes side column
  const nx = box.x + calW + 4;
  out.push(svgRect(nx, calTop, notesW, calH, { stroke: accentColor, strokeWidth: sw * 1.4 }));
  out.push(svgText(nx + 3, calTop + 5, "MONTHLY NOTES", { fill: accentColor, sizeMm: 2.7, weight: "700" }));
  out.push(drawLinesInBox(nx + 2, calTop + 7, notesW - 4, box.bottom, 7.5, lineColor, sw, true));
  return out.join("");
}

export function renderTaskPlanning(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const gap = 5;
  const leftW = box.width * 0.58;
  const rightW = box.width - leftW - gap;
  const rx = box.x + leftW + gap;
  const out: string[] = [];

  // Left: Priorities + Tasks
  const priH = box.height * 0.28;
  out.push(svgRect(box.x, box.y, leftW, priH, { stroke: accentColor, strokeWidth: sw * 1.4 }));
  out.push(svgText(box.x + 3, box.y + 5.5, "PRI · TOP PRIORITIES", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(drawLinesInBox(box.x + 2, box.y + 7, leftW - 4, box.y + priH, 8, lineColor, sw, true));

  const taskY = box.y + priH + gap;
  const taskH = box.bottom - taskY;
  out.push(svgRect(box.x, taskY, leftW, taskH, { stroke: accentColor, strokeWidth: sw * 1.4 }));
  out.push(svgText(box.x + 3, taskY + 5.5, "TASKS & ACTION DESCRIPTIONS", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(drawLinesInBox(box.x + 2, taskY + 7, leftW - 4, box.bottom, 8, lineColor, sw, true));

  // Right: Goal box + Shopping Memo
  const goalH = box.height * 0.42;
  out.push(svgRect(rx, box.y, rightW, goalH, { stroke: accentColor, strokeWidth: sw * 1.4 }));
  out.push(svgText(rx + 3, box.y + 5.5, "MAIN GOAL", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(drawLinesInBox(rx + 2, box.y + 7, rightW - 4, box.y + goalH, 8, lineColor, sw));

  const shopY = box.y + goalH + gap;
  const shopH = box.bottom - shopY;
  out.push(svgRect(rx, shopY, rightW, shopH, { stroke: accentColor, strokeWidth: sw * 1.4 }));
  out.push(svgText(rx + 3, shopY + 5.5, "SHOPPING / SUPPLIES MEMO", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(drawLinesInBox(rx + 2, shopY + 7, rightW - 4, box.bottom, 8, lineColor, sw, true));

  return out.join("");
}

export function renderProjectPlanning(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 5.5, "PROJECT:", { fill: accentColor, sizeMm: 3.4, weight: "700" }));
  out.push(svgLine(box.x + 22, box.y + 6, box.x + box.width * 0.62, box.y + 6, { stroke: lineColor, width: sw }));
  out.push(svgText(box.x + box.width * 0.65, box.y + 5.5, "DEADLINE:", { fill: accentColor, sizeMm: 3.2, weight: "700" }));
  out.push(svgLine(box.x + box.width * 0.82, box.y + 6, box.right, box.y + 6, { stroke: lineColor, width: sw }));

  const tableY = box.y + 12;
  const headH = 8;
  const rowH = 10;
  const ratios = [0.08, 0.44, 0.2, 0.16, 0.12];
  const labels = ["DONE", "MILESTONE / TASK", "OWNER", "DUE", "STATUS"];
  const rows = Math.max(8, Math.floor((box.bottom - tableY - headH) / rowH));

  out.push(svgRect(box.x, tableY, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
  let cx = box.x;
  labels.forEach((lbl, idx) => {
    const w = box.width * ratios[idx]!;
    out.push(svgText(cx + w / 2, tableY + 5.5, lbl, { fill: accentColor, sizeMm: 2.5, anchor: "middle", weight: "700" }));
    if (idx > 0) out.push(svgLine(cx, tableY, cx, tableY + headH + rows * rowH, { stroke: lineColor, width: sw }));
    cx += w;
  });

  for (let r = 0; r < rows; r++) {
    const ry = tableY + headH + r * rowH;
    out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
    const chkSize = 3.6;
    out.push(svgRect(box.x + (box.width * ratios[0]! - chkSize) / 2, ry + (rowH - chkSize) / 2, chkSize, chkSize, { stroke: accentColor, strokeWidth: sw }));
  }
  return out.join("");
}

export function renderWeeklyGridSheet(
  ctx: RenderContext,
  variant: "weekly-checklist" | "weekly-meal-planner" | "medication-tracker",
): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  if (variant === "weekly-checklist") {
    const headH = 10;
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const taskW = box.width * 0.46;
    const dayW = (box.width - taskW) / 7;
    const rowH = 10;
    const rewardH = 20;
    const rows = Math.max(6, Math.floor((box.height - headH - rewardH - 6) / rowH));
    out.push(svgText(box.x, box.y + 5, "WEEKLY CHECKLIST / CHORE CHART", { fill: accentColor, sizeMm: 3.4, weight: "700" }));
    const tY = box.y + 8;
    out.push(svgRect(box.x, tY, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
    out.push(svgText(box.x + 3, tY + 6.5, "TASK / CHORE", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
    days.forEach((d, i) => {
      const dx = box.x + taskW + i * dayW;
      out.push(svgLine(dx, tY, dx, tY + headH + rows * rowH, { stroke: lineColor, width: sw }));
      out.push(svgText(dx + dayW / 2, tY + 6.5, d, { fill: accentColor, sizeMm: 2.4, anchor: "middle", weight: "700" }));
    });
    for (let r = 0; r < rows; r++) {
      const ry = tY + headH + r * rowH;
      out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
      for (let d = 0; d < 7; d++) {
        const dx = box.x + taskW + d * dayW;
        out.push(svgRect(dx + (dayW - 4) / 2, ry + (rowH - 4) / 2, 4, 4, { stroke: accentColor, strokeWidth: sw }));
      }
    }
    const rY = tY + headH + rows * rowH + 4;
    out.push(svgRect(box.x, rY, box.width, Math.max(12, box.bottom - rY), { stroke: accentColor, strokeWidth: sw * 1.3 }));
    out.push(svgText(box.x + 3, rY + 5.5, "REWARD / WEEKLY NOTES:", { fill: accentColor, sizeMm: 2.7, weight: "700" }));
    return out.join("");
  }

  if (variant === "weekly-meal-planner") {
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const meals = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
    const grocW = box.width * 0.24;
    const gridW = box.width - grocW - 4;
    const labelW = 24;
    const dayColW = (gridW - labelW) / 7;
    const headH = 8;
    const mealRowH = (box.height - 10 - headH) / 4;
    const tY = box.y + 8;

    out.push(svgText(box.x, box.y + 5, "WEEKLY MEAL PLANNER", { fill: accentColor, sizeMm: 3.4, weight: "700" }));
    out.push(svgRect(box.x, tY, gridW, headH + mealRowH * 4, { stroke: accentColor, strokeWidth: sw * 1.4 }));
    days.forEach((d, i) => {
      const dx = box.x + labelW + i * dayColW;
      out.push(svgLine(dx, tY, dx, tY + headH + mealRowH * 4, { stroke: lineColor, width: sw }));
      out.push(svgText(dx + dayColW / 2, tY + 5.5, d, { fill: accentColor, sizeMm: 2.5, anchor: "middle", weight: "700" }));
    });
    meals.forEach((m, r) => {
      const ry = tY + headH + r * mealRowH;
      out.push(svgLine(box.x, ry, box.x + gridW, ry, { stroke: lineColor, width: sw }));
      out.push(svgText(box.x + 2, ry + 5.5, m, { fill: textColor, sizeMm: 2.3, weight: "700" }));
    });

    const gx = box.x + gridW + 4;
    out.push(svgRect(gx, tY, grocW, headH + mealRowH * 4, { stroke: accentColor, strokeWidth: sw * 1.4 }));
    out.push(svgText(gx + 3, tY + 5.5, "GROCERY LIST", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
    out.push(drawLinesInBox(gx + 2, tY + 8, grocW - 4, box.bottom, 7.5, lineColor, sw, true));
    return out.join("");
  }

  // medication-tracker
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const medW = box.width * 0.28;
  const doseW = box.width * 0.14;
  const dayW = (box.width - medW - doseW) / 7;
  const headH = 10;
  const rowH = 14;
  const tY = box.y + 8;
  const rows = Math.max(6, Math.floor((box.bottom - tY - headH) / rowH));

  out.push(svgText(box.x, box.y + 5, "WEEKLY MEDICATION TRACKER (AM · NOON · PM · BED)", { fill: accentColor, sizeMm: 3.3, weight: "700" }));
  out.push(svgRect(box.x, tY, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(box.x + 3, tY + 6.5, "MEDICATION", { fill: accentColor, sizeMm: 2.7, weight: "700" }));
  out.push(svgText(box.x + medW + 2, tY + 6.5, "DOSE / TIME", { fill: accentColor, sizeMm: 2.5, weight: "700" }));
  out.push(svgLine(box.x + medW, tY, box.x + medW, tY + headH + rows * rowH, { stroke: lineColor, width: sw }));

  days.forEach((d, i) => {
    const dx = box.x + medW + doseW + i * dayW;
    out.push(svgLine(dx, tY, dx, tY + headH + rows * rowH, { stroke: lineColor, width: sw }));
    out.push(svgText(dx + dayW / 2, tY + 6.5, d, { fill: accentColor, sizeMm: 2.7, anchor: "middle", weight: "700" }));
  });
  for (let r = 0; r < rows; r++) {
    const ry = tY + headH + r * rowH;
    out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
    for (let d = 0; d < 7; d++) {
      const dx = box.x + medW + doseW + d * dayW;
      for (let b = 0; b < 4; b++) {
        const bx = dx + 1.5 + (b % 2) * (dayW / 2 - 1);
        const by = ry + 2 + Math.floor(b / 2) * 5.5;
        out.push(svgRect(bx, by, 3.3, 3.3, { stroke: accentColor, strokeWidth: sw * 0.9 }));
      }
    }
  }
  return out.join("");
}

export function renderMonthlyHabitTracker(ctx: RenderContext): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 5, "MONTHLY HABIT TRACKER · MONTH: ______________", { fill: accentColor, sizeMm: 3.3, weight: "700" }));
  const tY = box.y + 9;
  const habitW = Math.max(40, box.width * 0.25);
  const days = 31;
  const dayW = (box.width - habitW) / days;
  const headH = 8;
  const rowH = Math.max(8, Math.min(12, dayW * 1.9));
  const rows = Math.max(8, Math.floor((box.bottom - tY - headH) / rowH));

  out.push(svgRect(box.x, tY, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(box.x + 2.5, tY + 5.5, "HABIT", { fill: accentColor, sizeMm: 2.7, weight: "700" }));
  for (let d = 1; d <= days; d++) {
    const dx = box.x + habitW + (d - 1) * dayW;
    out.push(svgLine(dx, tY, dx, tY + headH + rows * rowH, { stroke: lineColor, width: sw * 0.8 }));
    out.push(svgText(dx + dayW / 2, tY + 5.3, String(d), { fill: textColor, sizeMm: Math.min(2.2, dayW * 0.62), anchor: "middle" }));
  }
  for (let r = 0; r < rows; r++) {
    const ry = tY + headH + r * rowH;
    out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
  }
  return out.join("");
}

export function renderWorkoutLog(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 5.5, "WORKOUT LOG · FOCUS: _______________________", { fill: accentColor, sizeMm: 3.3, weight: "700" }));
  const tY = box.y + 10;
  const headH = 8;
  const ratios = [0.34, 0.16, 0.16, 0.16, 0.18];
  const labels = ["EXERCISE", "SET 1 (W×R)", "SET 2 (W×R)", "SET 3 (W×R)", "SET 4 / RPE"];
  const cardioH = 34;
  const rowH = 11;
  const rows = Math.max(8, Math.floor((box.bottom - tY - headH - cardioH - 6) / rowH));

  out.push(svgRect(box.x, tY, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
  let cx = box.x;
  labels.forEach((lbl, i) => {
    const w = box.width * ratios[i]!;
    out.push(svgText(cx + w / 2, tY + 5.4, lbl, { fill: accentColor, sizeMm: 2.5, anchor: "middle", weight: "700" }));
    if (i > 0) out.push(svgLine(cx, tY, cx, tY + headH + rows * rowH, { stroke: lineColor, width: sw }));
    cx += w;
  });
  for (let r = 0; r < rows; r++) {
    const ry = tY + headH + r * rowH;
    out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
  }
  const cY = tY + headH + rows * rowH + 5;
  out.push(svgRect(box.x, cY, box.width, Math.max(15, box.bottom - cY), { stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(box.x + 3, cY + 5.5, "CARDIO / WARM-UP / NOTES", { fill: accentColor, sizeMm: 2.8, weight: "700" }));
  out.push(drawLinesInBox(box.x + 2, cY + 8, box.width - 4, box.bottom, 7.5, lineColor, sw));
  return out.join("");
}

export function renderHouseholdBudget(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 5.5, "HOUSEHOLD BUDGET · PERIOD: ___________________", { fill: accentColor, sizeMm: 3.3, weight: "700" }));
  const tY = box.y + 10;
  const headH = 8;
  const ratios = [0.44, 0.18, 0.18, 0.2];
  const labels = ["CATEGORY / ITEM", "BUDGETED", "ACTUAL", "DIFFERENCE"];
  const rowH = 8.5;
  const rows = Math.max(10, Math.floor((box.bottom - tY - headH) / rowH));

  out.push(svgRect(box.x, tY, box.width, headH, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw * 1.3 }));
  let cx = box.x;
  labels.forEach((lbl, i) => {
    const w = box.width * ratios[i]!;
    out.push(svgText(cx + w / 2, tY + 5.4, lbl, { fill: accentColor, sizeMm: 2.6, anchor: "middle", weight: "700" }));
    if (i > 0) out.push(svgLine(cx, tY, cx, tY + headH + rows * rowH, { stroke: lineColor, width: sw }));
    cx += w;
  });
  const presets = ["INCOME", "", "", "HOUSING / RENT", "UTILITIES", "GROCERIES", "TRANSPORT", "HEALTHCARE", "SAVINGS / DEBT"];
  for (let r = 0; r < rows; r++) {
    const ry = tY + headH + r * rowH;
    out.push(svgRect(box.x, ry, box.width, rowH, { stroke: lineColor, strokeWidth: sw }));
    const preset = presets[r];
    if (preset) {
      out.push(svgText(box.x + 2.5, ry + 5.6, preset, { fill: accentColor, sizeMm: 2.4, weight: "600", opacity: 0.85 }));
    }
  }
  return out.join("");
}

export function renderSwotAnalysis(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const gap = 5;
  const qW = (box.width - gap) / 2;
  const qH = (box.height - gap) / 2;
  const quads = [
    { title: "S · STRENGTHS", sub: "Internal positive factors" },
    { title: "W · WEAKNESSES", sub: "Internal areas to improve" },
    { title: "O · OPPORTUNITIES", sub: "External favorable trends" },
    { title: "T · THREATS", sub: "External risks & challenges" },
  ];
  const out: string[] = [];

  quads.forEach((q, idx) => {
    const c = idx % 2;
    const r = Math.floor(idx / 2);
    const x = box.x + c * (qW + gap);
    const y = box.y + r * (qH + gap);
    out.push(svgRect(x, y, qW, qH, { stroke: accentColor, strokeWidth: sw * 1.5, rx: 2 }));
    out.push(svgRect(x, y, qW, 11, { fill: accentColor, fillOpacity: 0.1, stroke: accentColor, strokeWidth: sw }));
    out.push(svgText(x + 3, y + 5, q.title, { fill: accentColor, sizeMm: 3.1, weight: "700" }));
    out.push(svgText(x + 3, y + 9, q.sub, { fill: lineColor, sizeMm: 2.2 }));
    out.push(drawLinesInBox(x + 2, y + 12, qW - 4, y + qH, 6.5, lineColor, sw));
  });
  return out.join("");
}

export function renderGoalThermometer(ctx: RenderContext): string {
  const { geom, lineColor, accentColor, textColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const out: string[] = [];

  out.push(svgText(box.x, box.y + 6, "GOAL TRACKER: ______________________________", { fill: accentColor, sizeMm: 3.6, weight: "700" }));

  const thermX = box.x + 28;
  const bulbR = 14;
  const tubeW = 14;
  const topY = box.y + 18;
  const bottomY = box.bottom - bulbR * 2 - 4;
  const tubeH = Math.max(40, bottomY - topY);

  // Tube & bulb
  out.push(svgRect(thermX - tubeW / 2, topY, tubeW, tubeH + bulbR, { stroke: accentColor, strokeWidth: sw * 1.8, rx: tubeW / 2 }));
  out.push(svgCircle(thermX, bottomY + bulbR, bulbR, { fill: accentColor, fillOpacity: 0.15, stroke: accentColor, strokeWidth: sw * 1.8 }));

  // Tick marks 0%..100%
  for (let pct = 0; pct <= 100; pct += 10) {
    const ty = bottomY - (pct / 100) * tubeH;
    out.push(svgLine(thermX + tubeW / 2, ty, thermX + tubeW / 2 + 5, ty, { stroke: accentColor, width: sw * 1.2 }));
    out.push(svgText(thermX + tubeW / 2 + 7, ty + 1, `${pct}%`, { fill: textColor, sizeMm: 2.6, weight: "700" }));
  }

  // Right milestone lines
  const mx = thermX + tubeW / 2 + 24;
  const mw = Math.max(30, box.right - mx);
  out.push(svgRect(mx, topY, mw, box.bottom - topY, { stroke: accentColor, strokeWidth: sw * 1.3 }));
  out.push(svgText(mx + 3, topY + 6, "MILESTONES & TARGETS", { fill: accentColor, sizeMm: 3, weight: "700" }));
  out.push(drawLinesInBox(mx + 2, topY + 9, mw - 4, box.bottom, 10, lineColor, sw, true));
  return out.join("");
}

export function renderRecipeCards(ctx: RenderContext): string {
  const { geom, lineColor, accentColor } = ctx;
  const box = geom.contentBox;
  const sw = geom.strokeWidthMm;
  const gap = 6;
  const cardW = (box.width - gap) / 2;
  const cardH = (box.height - gap) / 2;
  const out: string[] = [];

  for (let i = 0; i < 4; i++) {
    const c = i % 2;
    const r = Math.floor(i / 2);
    const x = box.x + c * (cardW + gap);
    const y = box.y + r * (cardH + gap);
    out.push(svgRect(x, y, cardW, cardH, { stroke: accentColor, strokeWidth: sw * 1.4, dash: 'stroke-dasharray="3 2"' }));
    out.push(svgText(x + 3, y + 6, "RECIPE:", { fill: accentColor, sizeMm: 3, weight: "700" }));
    out.push(svgLine(x + 18, y + 6.5, x + cardW - 3, y + 6.5, { stroke: lineColor, width: sw }));
    out.push(svgText(x + 3, y + 11.5, "PREP: ____  COOK: ____  SERVES: ___", { fill: lineColor, sizeMm: 2.2, weight: "600" }));
    out.push(svgLine(x, y + 14, x + cardW, y + 14, { stroke: accentColor, width: sw }));

    const ingW = cardW * 0.42;
    out.push(svgLine(x + ingW, y + 14, x + ingW, y + cardH, { stroke: lineColor, width: sw }));
    out.push(svgText(x + 2.5, y + 18.5, "INGREDIENTS", { fill: accentColor, sizeMm: 2.3, weight: "700" }));
    out.push(svgText(x + ingW + 2.5, y + 18.5, "METHOD / STEPS", { fill: accentColor, sizeMm: 2.3, weight: "700" }));
    out.push(drawLinesInBox(x + 1.5, y + 20, ingW - 3, y + cardH, 5.5, lineColor, sw));
    out.push(drawLinesInBox(x + ingW + 1.5, y + 20, cardW - ingW - 3, y + cardH, 5.5, lineColor, sw));
  }
  return out.join("");
}
