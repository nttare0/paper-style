import { getTemplateSpec } from "../data/templates";
import type { PaperSettings } from "../types/paper";
import { computeGridStep, type SheetLayoutGeometry } from "./geometry";

export interface SheetField {
  id: string;
  label: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  stepMm: number;
  fontSizeMm?: number;
  singleLine?: boolean;
  placeholder?: string;
}

function resolveStep(settings: PaperSettings, sourceHeightMm: number, fallbackMm = 6.5): number {
  const raw = settings.lineSpacingMm;
  if (raw >= 4.5 && raw <= 14) {
    return computeGridStep(sourceHeightMm, raw, settings.layoutMode).stepMm;
  }
  return fallbackMm;
}

export function getSheetFields(
  settings: PaperSettings,
  geom: SheetLayoutGeometry,
): SheetField[] {
  const fields: SheetField[] = [];
  const box = geom.contentBox;
  const tpl = getTemplateSpec(settings.paperType);

  if (settings.showDateLine) {
    const dateSize = Math.max(2, Math.min(5, settings.dateFontSizeMm));
    const lineLen = Math.min(42, geom.printableBox.width * 0.35);
    const lineStart = geom.printableBox.right - lineLen;
    fields.push({
      id: "date",
      label: "Date",
      xMm: lineStart + 1,
      yMm: Math.max(2, geom.margins.top - 0.5),
      widthMm: Math.max(12, lineLen - 2),
      heightMm: Math.max(6, dateSize + 2.4),
      stepMm: Math.max(5, dateSize + 2),
      fontSizeMm: Math.min(3.8, Math.max(2.6, dateSize * 1.15)),
      singleLine: true,
      placeholder: "Date",
    });
  }

  switch (settings.paperType) {
    case "lined":
    case "blank":
    case "dot":
    case "grid":
    case "seyes-grid":
    case "pink-millimeter-grid":
    case "cross-grid":
    case "sketch-paper":
    case "vertical-lined": {
      let xMm = box.x + 2;
      let widthMm = Math.max(10, box.width - 4);
      if (tpl.supportsLeftMarginRule && settings.showLeftMarginRule) {
        const marginOffset = Math.min(22, box.width * 0.14);
        xMm = geom.isBackPage ? box.x + 2 : box.x + marginOffset + 2;
        widthMm = Math.max(10, box.width - marginOffset - 4);
      }
      fields.push({
        id: "main",
        label: tpl.name,
        xMm,
        yMm: box.y,
        widthMm,
        heightMm: Math.max(12, box.height),
        stepMm: resolveStep(settings, box.height),
        placeholder: `Write on ${tpl.name}...`,
      });
      break;
    }

    case "vintage-note": {
      const h = Math.max(12, box.height - 12);
      fields.push({
        id: "main",
        label: "Vintage Note",
        xMm: box.x + 5,
        yMm: box.y + 6,
        widthMm: Math.max(10, box.width - 10),
        heightMm: h,
        stepMm: resolveStep(settings, h),
        placeholder: "Write your note...",
      });
      break;
    }

    case "minimal-journal": {
      fields.push({
        id: "title",
        label: "Title",
        xMm: box.x + 15,
        yMm: box.y + 0.3,
        widthMm: Math.max(20, box.width - 16),
        heightMm: 6.2,
        stepMm: 5.5,
        fontSizeMm: 3.4,
        singleLine: true,
        placeholder: "Title...",
      });
      const bodyH = Math.max(12, box.height - 11);
      fields.push({
        id: "main",
        label: "Journal Entry",
        xMm: box.x + 2,
        yMm: box.y + 11,
        widthMm: Math.max(10, box.width - 4),
        heightMm: bodyH,
        stepMm: resolveStep(settings, bodyH),
        placeholder: "Journal thoughts...",
      });
      break;
    }

    case "branded-paper": {
      const headerY = box.y + 18;
      const footerY = box.bottom - 10;
      const bodyH = Math.max(12, footerY - headerY - 6);
      fields.push({
        id: "main",
        label: "Document Body",
        xMm: box.x + 2,
        yMm: headerY + 3,
        widthMm: Math.max(10, box.width - 4),
        heightMm: bodyH,
        stepMm: resolveStep(settings, bodyH),
        placeholder: "Write document text...",
      });
      break;
    }

    case "split-column": {
      const gap = 4;
      const halfW = (box.width - gap) / 2;
      const stepMm = resolveStep(settings, box.height);
      fields.push(
        {
          id: "left",
          label: "Left Grid Column",
          xMm: box.x + 1.5,
          yMm: box.y,
          widthMm: Math.max(10, halfW - 3),
          heightMm: box.height,
          stepMm,
          placeholder: "Notes / labels...",
        },
        {
          id: "right",
          label: "Right Lined Column",
          xMm: box.x + halfW + gap + 1.5,
          yMm: box.y,
          widthMm: Math.max(10, halfW - 3),
          heightMm: box.height,
          stepMm,
          placeholder: "Write notes...",
        },
      );
      break;
    }

    case "cornell-notes": {
      const headerH = 16;
      const summaryH = Math.min(48, box.height * 0.18);
      const cueW = Math.min(58, box.width * 0.3);
      const notesTop = box.y + headerH;
      const notesBottom = box.bottom - summaryH;
      const cueX = geom.isBackPage ? box.right - cueW : box.x + cueW;
      const bodyH = Math.max(10, notesBottom - (notesTop + 7));
      const notesStep = resolveStep(settings, bodyH);
      const sumH = Math.max(10, summaryH - 7);
      const sumStep = resolveStep(settings, sumH);

      fields.push({
        id: "topic",
        label: "Topic / Subject",
        xMm: box.x + 37,
        yMm: box.y + 3,
        widthMm: Math.max(20, box.width - 39),
        heightMm: 6.5,
        stepMm: 5.8,
        fontSizeMm: 3.4,
        singleLine: true,
        placeholder: "Topic / Subject",
      });

      const cueField: SheetField = {
        id: "cues",
        label: "Cues & Questions",
        xMm: (geom.isBackPage ? cueX : box.x) + 2,
        yMm: notesTop + 7,
        widthMm: Math.max(10, cueW - 4),
        heightMm: bodyH - 0.5,
        stepMm: notesStep,
        placeholder: "Cues & questions...",
      };
      const notesField: SheetField = {
        id: "notes",
        label: "Notes",
        xMm: (geom.isBackPage ? box.x : cueX) + 2,
        yMm: notesTop + 7,
        widthMm: Math.max(10, box.width - cueW - 4),
        heightMm: bodyH - 0.5,
        stepMm: notesStep,
        placeholder: "Lecture notes...",
      };
      fields.push(...(geom.isBackPage ? [notesField, cueField] : [cueField, notesField]));
      fields.push({
        id: "summary",
        label: "Summary",
        xMm: box.x + 2,
        yMm: notesBottom + 7,
        widthMm: Math.max(10, box.width - 4),
        heightMm: sumH - 0.5,
        stepMm: sumStep,
        placeholder: "Summary...",
      });
      break;
    }

    case "student-note": {
      const headerY = box.y + 14;
      const sideW = Math.min(45, box.width * 0.26);
      const sideX = box.x + sideW;
      const bodyH = Math.max(10, box.bottom - headerY - 6);
      const stepMm = resolveStep(settings, bodyH);
      fields.push(
        {
          id: "topic",
          label: "Course / Topic",
          xMm: box.x + 35,
          yMm: box.y + 0.5,
          widthMm: Math.max(20, box.width - 37),
          heightMm: 6.2,
          stepMm: 5.6,
          fontSizeMm: 3.3,
          singleLine: true,
          placeholder: "Course / Topic",
        },
        {
          id: "terms",
          label: "Key Terms",
          xMm: box.x + 1.5,
          yMm: headerY + 6,
          widthMm: Math.max(10, sideW - 3),
          heightMm: bodyH,
          stepMm,
          placeholder: "Key terms...",
        },
        {
          id: "notes",
          label: "Lecture Notes",
          xMm: sideX + 2,
          yMm: headerY + 6,
          widthMm: Math.max(10, box.width - sideW - 3.5),
          heightMm: bodyH,
          stepMm,
          placeholder: "Lecture notes...",
        },
      );
      break;
    }

    case "meeting-note": {
      const headerH = 22;
      const actionH = Math.min(54, box.height * 0.24);
      const notesTop = box.y + headerH;
      const actionTop = box.bottom - actionH;
      const agendaH = Math.max(10, actionTop - notesTop - 9);
      const actStep = Math.max(6, settings.lineSpacingMm);
      fields.push(
        {
          id: "meeting",
          label: "Meeting",
          xMm: box.x + 22,
          yMm: box.y + 1.6,
          widthMm: Math.max(20, box.width - 24),
          heightMm: 5.8,
          stepMm: 5.2,
          fontSizeMm: 3.2,
          singleLine: true,
          placeholder: "Meeting title",
        },
        {
          id: "attendees",
          label: "Attendees",
          xMm: box.x + 27,
          yMm: box.y + 8.6,
          widthMm: Math.max(20, box.width - 29),
          heightMm: 5.8,
          stepMm: 5.2,
          fontSizeMm: 3.0,
          singleLine: true,
          placeholder: "Attendees",
        },
        {
          id: "agenda",
          label: "Agenda & Discussion",
          xMm: box.x + 1.5,
          yMm: notesTop + 6,
          widthMm: Math.max(10, box.width - 3),
          heightMm: agendaH,
          stepMm: resolveStep(settings, agendaH),
          placeholder: "Agenda & discussion...",
        },
        {
          id: "actions",
          label: "Action Items",
          xMm: box.x + 7,
          yMm: actionTop + 8,
          widthMm: Math.max(10, box.width - 8.5),
          heightMm: Math.max(8, box.bottom - actionTop - 8.5),
          stepMm: actStep,
          placeholder: "Action items...",
        },
      );
      break;
    }

    case "children-drawing": {
      const drawH = box.height * 0.52;
      const writeTop = box.y + drawH + 8;
      const band = Math.max(8, settings.lineSpacingMm * 1.3);
      fields.push({
        id: "writing",
        label: "Writing Lines",
        xMm: box.x + 2,
        yMm: writeTop,
        widthMm: Math.max(10, box.width - 4),
        heightMm: Math.max(10, box.bottom - writeTop),
        stepMm: band + 4,
        placeholder: "Story caption...",
      });
      break;
    }

    case "us-handwriting-half": {
      const drawH = box.height * 0.48;
      const writeTop = box.y + drawH + 8;
      const bandH = Math.max(6, settings.lineSpacingMm * 1.4);
      fields.push({
        id: "writing",
        label: "Handwriting Lines",
        xMm: box.x + 2,
        yMm: writeTop,
        widthMm: Math.max(10, box.width - 4),
        heightMm: Math.max(10, box.bottom - writeTop),
        stepMm: bandH * 1.55,
        placeholder: "Write sentence...",
      });
      break;
    }

    case "creative-log": {
      const splitY = box.y + box.height * 0.48;
      const ideasH = Math.max(10, box.bottom - (splitY + 8));
      fields.push(
        {
          id: "sketch",
          label: "Sketch / Mind Map",
          xMm: box.x + 2,
          yMm: box.y + 7,
          widthMm: Math.max(10, box.width - 4),
          heightMm: Math.max(10, splitY - box.y - 10),
          stepMm: 6.5,
          placeholder: "Mind map notes...",
        },
        {
          id: "ideas",
          label: "Ideas & Notes",
          xMm: box.x + 2,
          yMm: splitY + 8,
          widthMm: Math.max(10, box.width - 4),
          heightMm: ideasH,
          stepMm: resolveStep(settings, ideasH),
          placeholder: "Ideas & reflections...",
        },
      );
      break;
    }

    case "storyboard": {
      const cols = box.width > box.height ? 3 : 2;
      const rows = 3;
      const gapX = 6;
      const gapY = 6;
      const cellW = (box.width - gapX * (cols - 1)) / cols;
      const cellH = (box.height - gapY * (rows - 1)) / rows;
      const frameH = Math.min(cellW * (9 / 16), cellH * 0.62);
      const lineStep = Math.max(4.5, Math.min(8, settings.lineSpacingMm * 0.8));
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = box.x + c * (cellW + gapX);
          const cy = box.y + r * (cellH + gapY);
          const lineTop = cy + frameH + 3.2;
          fields.push({
            id: `scene-${idx}`,
            label: `Scene #${idx} Caption`,
            xMm: cx + 1,
            yMm: lineTop,
            widthMm: Math.max(12, cellW - 2),
            heightMm: Math.max(6, cellH - frameH - 3.5),
            stepMm: lineStep,
            placeholder: `Scene #${idx}...`,
          });
          idx++;
        }
      }
      break;
    }

    case "daily-planner": {
      const headerH = 14;
      const bodyY = box.y + headerH;
      const bodyH = box.bottom - bodyY;
      const leftW = box.width * 0.56;
      const gap = 5;
      const rightX = box.x + leftW + gap;
      const rightW = box.width - leftW - gap;
      const schedTop = bodyY + 8;
      const rowH = (bodyH - 8) / 16;
      const priH = bodyH * 0.25;
      const todoH = bodyH * 0.42;
      const notesY = bodyY + priH + todoH + 8;
      const notesH = Math.max(12, box.bottom - notesY);

      fields.push(
        {
          id: "schedule",
          label: "Time Schedule",
          xMm: box.x + 15.5,
          yMm: schedTop,
          widthMm: Math.max(16, leftW - 17),
          heightMm: bodyH - 8,
          stepMm: rowH,
          placeholder: "06:00 schedule...",
        },
        {
          id: "priorities",
          label: "Top 3 Priorities",
          xMm: rightX + 8,
          yMm: bodyY + 7,
          widthMm: Math.max(14, rightW - 10),
          heightMm: Math.max(8, priH - 7.5),
          stepMm: Math.max(7, (priH - 10) / 3),
          placeholder: "Top priorities...",
        },
        {
          id: "todo",
          label: "To-Do List",
          xMm: rightX + 8,
          yMm: bodyY + priH + 11,
          widthMm: Math.max(14, rightW - 10),
          heightMm: Math.max(8, todoH - 7.5),
          stepMm: 7,
          placeholder: "Tasks...",
        },
        {
          id: "notes",
          label: "Notes & Gratitude",
          xMm: rightX + 2,
          yMm: notesY + 7,
          widthMm: Math.max(14, rightW - 4),
          heightMm: Math.max(8, notesH - 7.5),
          stepMm: 7,
          placeholder: "Notes...",
        },
      );
      break;
    }

    case "weekly-planner": {
      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
        "Weekly Notes",
      ];
      const cols = 2;
      const rows = 4;
      const gap = 5;
      const cellW = (box.width - gap) / cols;
      const cellH = (box.height - gap * (rows - 1)) / rows;
      const stepMm = Math.max(5.5, Math.min(9, settings.lineSpacingMm));
      days.forEach((dayName, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = box.x + c * (cellW + gap);
        const y = box.y + r * (cellH + gap);
        fields.push({
          id: `day-${i}`,
          label: dayName,
          xMm: x + 2,
          yMm: y + 8,
          widthMm: Math.max(14, cellW - 4),
          heightMm: Math.max(8, cellH - 8.5),
          stepMm,
          placeholder: `${dayName}...`,
        });
      });
      break;
    }

    case "monthly-calendar": {
      const headerH = 14;
      const notesW = box.width * 0.18;
      const calW = box.width - notesW - 4;
      const calTop = box.y + headerH;
      const calH = box.bottom - calTop;
      const colHeadH = 7;
      const cellW = calW / 7;
      const cellH = (calH - colHeadH) / 5;

      fields.push(
        {
          id: "month",
          label: "Month",
          xMm: box.x + 16,
          yMm: box.y + 1,
          widthMm: Math.max(20, calW - 22),
          heightMm: 6.2,
          stepMm: 5.5,
          fontSizeMm: 3.4,
          singleLine: true,
          placeholder: "Month",
        },
        {
          id: "year",
          label: "Year",
          xMm: box.right - 22,
          yMm: box.y + 1,
          widthMm: 22,
          heightMm: 6.2,
          stepMm: 5.5,
          fontSizeMm: 3.4,
          singleLine: true,
          placeholder: "Year",
        },
      );
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 7; c++) {
          fields.push({
            id: `cal-${r}-${c}`,
            label: `Calendar Row ${r + 1} Col ${c + 1}`,
            xMm: box.x + c * cellW + 1,
            yMm: calTop + colHeadH + r * cellH + 1,
            widthMm: Math.max(10, cellW - 2),
            heightMm: Math.max(8, cellH - 2),
            stepMm: 4.5,
          });
        }
      }
      fields.push({
        id: "notes",
        label: "Monthly Notes",
        xMm: box.x + calW + 10,
        yMm: calTop + 7,
        widthMm: Math.max(12, notesW - 11.5),
        heightMm: Math.max(10, calH - 7.5),
        stepMm: 7.5,
        placeholder: "Notes...",
      });
      break;
    }

    case "task-planning": {
      const gap = 5;
      const leftW = box.width * 0.58;
      const rightW = box.width - leftW - gap;
      const rx = box.x + leftW + gap;
      const priH = box.height * 0.28;
      const taskY = box.y + priH + gap;
      const goalH = box.height * 0.42;
      const shopY = box.y + goalH + gap;
      fields.push(
        {
          id: "priorities",
          label: "Top Priorities",
          xMm: box.x + 8,
          yMm: box.y + 7,
          widthMm: Math.max(14, leftW - 10),
          heightMm: Math.max(8, priH - 7.5),
          stepMm: 8,
          placeholder: "Priorities...",
        },
        {
          id: "tasks",
          label: "Tasks & Actions",
          xMm: box.x + 8,
          yMm: taskY + 7,
          widthMm: Math.max(14, leftW - 10),
          heightMm: Math.max(8, box.bottom - taskY - 7.5),
          stepMm: 8,
          placeholder: "Tasks...",
        },
        {
          id: "goal",
          label: "Main Goal",
          xMm: rx + 2,
          yMm: box.y + 7,
          widthMm: Math.max(14, rightW - 4),
          heightMm: Math.max(8, goalH - 7.5),
          stepMm: 8,
          placeholder: "Main goal...",
        },
        {
          id: "shopping",
          label: "Shopping / Supplies Memo",
          xMm: rx + 8,
          yMm: shopY + 7,
          widthMm: Math.max(14, rightW - 10),
          heightMm: Math.max(8, box.bottom - shopY - 7.5),
          stepMm: 8,
          placeholder: "Supplies...",
        },
      );
      break;
    }

    case "swot-analysis": {
      const gap = 5;
      const qW = (box.width - gap) / 2;
      const qH = (box.height - gap) / 2;
      const titles = ["Strengths", "Weaknesses", "Opportunities", "Threats"];
      titles.forEach((title, idx) => {
        const c = idx % 2;
        const r = Math.floor(idx / 2);
        const x = box.x + c * (qW + gap);
        const y = box.y + r * (qH + gap);
        fields.push({
          id: `quad-${idx}`,
          label: title,
          xMm: x + 2,
          yMm: y + 12,
          widthMm: Math.max(14, qW - 4),
          heightMm: Math.max(10, qH - 12.5),
          stepMm: 6.5,
          placeholder: `${title}...`,
        });
      });
      break;
    }

    case "project-planning": {
      const tableY = box.y + 12;
      const headH = 8;
      const rowH = 10;
      const ratios = [0.08, 0.44, 0.2, 0.16, 0.12];
      const rows = Math.max(8, Math.floor((box.bottom - tableY - headH) / rowH));
      const bodyTop = tableY + headH;
      const bodyH = rows * rowH;

      fields.push(
        {
          id: "project",
          label: "Project",
          xMm: box.x + 22,
          yMm: box.y + 0.5,
          widthMm: Math.max(20, box.width * 0.62 - 23),
          heightMm: 6,
          stepMm: 5.5,
          fontSizeMm: 3.3,
          singleLine: true,
          placeholder: "Project name",
        },
        {
          id: "deadline",
          label: "Deadline",
          xMm: box.x + box.width * 0.82,
          yMm: box.y + 0.5,
          widthMm: Math.max(14, box.width * 0.18),
          heightMm: 6,
          stepMm: 5.5,
          fontSizeMm: 3.1,
          singleLine: true,
          placeholder: "Deadline",
        },
      );
      const colNames = ["", "Milestone / Task", "Owner", "Due", "Status"];
      let cx = box.x;
      ratios.forEach((ratio, i) => {
        const w = box.width * ratio;
        if (i > 0) {
          fields.push({
            id: `col-${i}`,
            label: colNames[i]!,
            xMm: cx + 1.5,
            yMm: bodyTop,
            widthMm: Math.max(10, w - 3),
            heightMm: bodyH,
            stepMm: rowH,
            placeholder: i === 1 ? "Milestones (1 per line)..." : colNames[i],
          });
        }
        cx += w;
      });
      break;
    }

    case "weekly-checklist": {
      const headH = 10;
      const taskW = box.width * 0.46;
      const rowH = 10;
      const rewardH = 20;
      const rows = Math.max(6, Math.floor((box.height - headH - rewardH - 6) / rowH));
      const tY = box.y + 8;
      const rY = tY + headH + rows * rowH + 4;
      fields.push(
        {
          id: "tasks",
          label: "Task / Chore List",
          xMm: box.x + 2,
          yMm: tY + headH,
          widthMm: Math.max(14, taskW - 4),
          heightMm: rows * rowH,
          stepMm: rowH,
          placeholder: "Tasks (1 per row)...",
        },
        {
          id: "notes",
          label: "Reward / Weekly Notes",
          xMm: box.x + 3,
          yMm: rY + 7,
          widthMm: Math.max(14, box.width - 6),
          heightMm: Math.max(8, box.bottom - rY - 7.5),
          stepMm: 6.5,
          placeholder: "Reward / notes...",
        },
      );
      break;
    }

    case "weekly-meal-planner": {
      const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
      const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
      const grocW = box.width * 0.24;
      const gridW = box.width - grocW - 4;
      const labelW = 24;
      const dayColW = (gridW - labelW) / 7;
      const headH = 8;
      const mealRowH = (box.height - 10 - headH) / 4;
      const tY = box.y + 8;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 7; c++) {
          fields.push({
            id: `meal-${r}-${c}`,
            label: `${days[c]} ${meals[r]}`,
            xMm: box.x + labelW + c * dayColW + 1,
            yMm: tY + headH + r * mealRowH + 1,
            widthMm: Math.max(10, dayColW - 2),
            heightMm: Math.max(8, mealRowH - 2),
            stepMm: 4.5,
          });
        }
      }
      fields.push({
        id: "grocery",
        label: "Grocery List",
        xMm: box.x + gridW + 10,
        yMm: tY + 8,
        widthMm: Math.max(12, grocW - 11.5),
        heightMm: Math.max(10, box.bottom - tY - 8.5),
        stepMm: 7.5,
        placeholder: "Groceries...",
      });
      break;
    }

    case "monthly-habit-tracker": {
      const tY = box.y + 9;
      const habitW = Math.max(40, box.width * 0.25);
      const dayW = (box.width - habitW) / 31;
      const headH = 8;
      const rowH = Math.max(8, Math.min(12, dayW * 1.9));
      const rows = Math.max(8, Math.floor((box.bottom - tY - headH) / rowH));
      fields.push(
        {
          id: "month",
          label: "Month",
          xMm: box.x + 62,
          yMm: box.y + 0.5,
          widthMm: Math.max(18, box.width - 64),
          heightMm: 6,
          stepMm: 5.5,
          fontSizeMm: 3.2,
          singleLine: true,
          placeholder: "Month",
        },
        {
          id: "habits",
          label: "Habits",
          xMm: box.x + 2,
          yMm: tY + headH,
          widthMm: Math.max(16, habitW - 4),
          heightMm: rows * rowH,
          stepMm: rowH,
          placeholder: "Habits (1 per row)...",
        },
      );
      break;
    }

    case "workout-log": {
      const tY = box.y + 10;
      const headH = 8;
      const ratios = [0.34, 0.16, 0.16, 0.16, 0.18];
      const names = ["Exercise", "Set 1", "Set 2", "Set 3", "Set 4 / RPE"];
      const cardioH = 34;
      const rowH = 11;
      const rows = Math.max(8, Math.floor((box.bottom - tY - headH - cardioH - 6) / rowH));
      const bodyTop = tY + headH;
      const bodyH = rows * rowH;

      fields.push({
        id: "focus",
        label: "Workout Focus",
        xMm: box.x + 42,
        yMm: box.y + 0.5,
        widthMm: Math.max(20, box.width - 44),
        heightMm: 6,
        stepMm: 5.5,
        fontSizeMm: 3.2,
        singleLine: true,
        placeholder: "Focus...",
      });

      let cx = box.x;
      ratios.forEach((ratio, i) => {
        const w = box.width * ratio;
        fields.push({
          id: `col-${i}`,
          label: names[i]!,
          xMm: cx + 1.5,
          yMm: bodyTop,
          widthMm: Math.max(10, w - 3),
          heightMm: bodyH,
          stepMm: rowH,
          placeholder: i === 0 ? "Exercises (1 per row)..." : names[i],
        });
        cx += w;
      });
      const cY = bodyTop + bodyH + 5;
      fields.push({
        id: "cardio",
        label: "Cardio / Warm-Up / Notes",
        xMm: box.x + 2,
        yMm: cY + 8,
        widthMm: Math.max(14, box.width - 4),
        heightMm: Math.max(10, box.bottom - cY - 8.5),
        stepMm: 7.5,
        placeholder: "Cardio & notes...",
      });
      break;
    }

    case "medication-tracker": {
      const medW = box.width * 0.28;
      const doseW = box.width * 0.14;
      const headH = 10;
      const rowH = 14;
      const tY = box.y + 8;
      const rows = Math.max(6, Math.floor((box.bottom - tY - headH) / rowH));
      const bodyTop = tY + headH;
      const bodyH = rows * rowH;
      fields.push(
        {
          id: "medication",
          label: "Medication",
          xMm: box.x + 2,
          yMm: bodyTop,
          widthMm: Math.max(12, medW - 4),
          heightMm: bodyH,
          stepMm: rowH,
          placeholder: "Medications...",
        },
        {
          id: "dose",
          label: "Dose / Time",
          xMm: box.x + medW + 1.5,
          yMm: bodyTop,
          widthMm: Math.max(10, doseW - 3),
          heightMm: bodyH,
          stepMm: rowH,
          placeholder: "Dose...",
        },
      );
      break;
    }

    case "household-budget": {
      const tY = box.y + 10;
      const headH = 8;
      const ratios = [0.44, 0.18, 0.18, 0.2];
      const names = ["Category / Item", "Budgeted", "Actual", "Difference"];
      const rowH = 8.5;
      const rows = Math.max(10, Math.floor((box.bottom - tY - headH) / rowH));
      const bodyTop = tY + headH;
      const bodyH = rows * rowH;

      fields.push({
        id: "period",
        label: "Period",
        xMm: box.x + 56,
        yMm: box.y + 0.5,
        widthMm: Math.max(20, box.width - 58),
        heightMm: 6,
        stepMm: 5.5,
        fontSizeMm: 3.2,
        singleLine: true,
        placeholder: "Period...",
      });

      let cx = box.x;
      ratios.forEach((ratio, i) => {
        const w = box.width * ratio;
        fields.push({
          id: `col-${i}`,
          label: names[i]!,
          xMm: cx + 1.5,
          yMm: bodyTop,
          widthMm: Math.max(10, w - 3),
          heightMm: bodyH,
          stepMm: rowH,
          placeholder: names[i],
        });
        cx += w;
      });
      break;
    }

    case "goal-thermometer": {
      const thermX = box.x + 28;
      const tubeW = 14;
      const topY = box.y + 18;
      const mx = thermX + tubeW / 2 + 24;
      const mw = Math.max(30, box.right - mx);
      fields.push(
        {
          id: "goal",
          label: "Goal Title",
          xMm: box.x + 30,
          yMm: box.y + 0.5,
          widthMm: Math.max(20, box.width - 32),
          heightMm: 6.5,
          stepMm: 5.8,
          fontSizeMm: 3.4,
          singleLine: true,
          placeholder: "Goal title...",
        },
        {
          id: "milestones",
          label: "Milestones & Targets",
          xMm: mx + 8,
          yMm: topY + 9,
          widthMm: Math.max(14, mw - 10),
          heightMm: Math.max(10, box.bottom - topY - 9.5),
          stepMm: 10,
          placeholder: "Milestones...",
        },
      );
      break;
    }

    case "recipe-cards": {
      const gap = 6;
      const cardW = (box.width - gap) / 2;
      const cardH = (box.height - gap) / 2;
      for (let i = 0; i < 4; i++) {
        const c = i % 2;
        const r = Math.floor(i / 2);
        const x = box.x + c * (cardW + gap);
        const y = box.y + r * (cardH + gap);
        const ingW = cardW * 0.42;
        fields.push(
          {
            id: `card-${i}-title`,
            label: `Recipe ${i + 1} Title`,
            xMm: x + 18,
            yMm: y + 1,
            widthMm: Math.max(14, cardW - 21),
            heightMm: 6,
            stepMm: 5.5,
            fontSizeMm: 3.0,
            singleLine: true,
            placeholder: "Recipe title",
          },
          {
            id: `card-${i}-ing`,
            label: `Recipe ${i + 1} Ingredients`,
            xMm: x + 1.5,
            yMm: y + 20,
            widthMm: Math.max(10, ingW - 3),
            heightMm: Math.max(10, cardH - 20.5),
            stepMm: 5.5,
            placeholder: "Ingredients...",
          },
          {
            id: `card-${i}-method`,
            label: `Recipe ${i + 1} Method`,
            xMm: x + ingW + 1.5,
            yMm: y + 20,
            widthMm: Math.max(10, cardW - ingW - 3),
            heightMm: Math.max(10, cardH - 20.5),
            stepMm: 5.5,
            placeholder: "Method...",
          },
        );
      }
      break;
    }

    case "error-correction": {
      const ratios = [0.32, 0.28, 0.4];
      const names = ["Question / Problem", "My Answer & Mistake", "Correct Solution"];
      const headH = 10;
      let cx = box.x;
      ratios.forEach((ratio, i) => {
        const w = box.width * ratio;
        fields.push({
          id: `col-${i}`,
          label: names[i]!,
          xMm: cx + 2,
          yMm: box.y + headH + 1,
          widthMm: Math.max(12, w - 4),
          heightMm: Math.max(12, box.height - headH - 2),
          stepMm: 6.5,
          placeholder: `${names[i]}...`,
        });
        cx += w;
      });
      break;
    }

    case "arithmetic": {
      fields.push(
        {
          id: "name",
          label: "Name",
          xMm: box.x + 14,
          yMm: box.y + 0.3,
          widthMm: Math.max(16, box.width * 0.55 - 15),
          heightMm: 5.8,
          stepMm: 5.2,
          fontSizeMm: 3.0,
          singleLine: true,
          placeholder: "Name",
        },
        {
          id: "score",
          label: "Score",
          xMm: box.x + box.width * 0.74,
          yMm: box.y + 0.3,
          widthMm: Math.max(12, box.width * 0.26),
          heightMm: 5.8,
          stepMm: 5.2,
          fontSizeMm: 3.0,
          singleLine: true,
          placeholder: "Score",
        },
      );
      break;
    }

    case "lineatur-3": {
      fields.push({
        id: "header",
        label: "Name / Datum / Blatt",
        xMm: box.x + 15,
        yMm: box.y + 2,
        widthMm: Math.max(20, box.width - 18),
        heightMm: 7,
        stepMm: 6,
        fontSizeMm: 3.0,
        singleLine: true,
        placeholder: "Name & date",
      });
      break;
    }

    case "chinese-preview-card": {
      const ratios = [0.16, 0.2, 0.22, 0.42];
      const names = ["汉字", "拼音", "部首 / 笔画", "组词 / 例句"];
      const headH = 10;
      const rowH = 18;
      const rows = Math.max(4, Math.floor((box.height - headH) / rowH));
      let cx = box.x;
      ratios.forEach((ratio, i) => {
        const w = box.width * ratio;
        if (i > 0) {
          fields.push({
            id: `col-${i}`,
            label: names[i]!,
            xMm: cx + 1.5,
            yMm: box.y + headH,
            widthMm: Math.max(10, w - 3),
            heightMm: rows * rowH,
            stepMm: rowH,
            placeholder: names[i],
          });
        }
        cx += w;
      });
      break;
    }

    default:
      // Music staves, guitar/bass tabs, character squares, handwriting bands, math charts:
      // use clean click-anywhere notes (plus Date field above if enabled).
      break;
  }

  return fields;
}
