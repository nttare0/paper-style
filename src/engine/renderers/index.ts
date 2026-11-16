import {
  renderCornellNotes,
  renderCrossGrid,
  renderDotGrid,
  renderGrid,
  renderHorizontalLines,
  renderSeyesGrid,
  renderSplitColumn,
  renderStoryboard,
  renderStructuredNoteSheet,
  renderVerticalLines,
} from "./basicLinesGrids";
import {
  renderArithmeticPaper,
  renderBlankClockFaces,
  renderFractionBars,
  renderHexagonalGrid,
  renderIsometricDot,
  renderIsometricGrid,
  renderKnittingGraph,
  renderLogGraph,
  renderNumberLine,
  renderPerspectiveGrid,
  renderPolarGrid,
  renderTenFrames,
} from "./geometryGraphs";
import {
  renderBraillePractice,
  renderCalligraphyPaper,
  renderCharacterGrid,
  renderChineseStudySheet,
  renderErrorCorrection,
  renderFourLineBands,
  renderGenkoYoshi,
  renderModernCalligraphySlant,
  renderPinyinTianzi,
  renderPracticePaper,
  renderSlantRuled,
} from "./handwritingCalligraphy";
import {
  renderBassTab,
  renderGuitarTab,
  renderMusicPaper,
  renderStaffUkuleleTab,
  renderTrebleChordDiagrams,
} from "./musicNotation";
import {
  renderDailyPlanner,
  renderGoalThermometer,
  renderHouseholdBudget,
  renderMonthlyCalendar,
  renderMonthlyHabitTracker,
  renderProjectPlanning,
  renderRecipeCards,
  renderSwotAnalysis,
  renderTaskPlanning,
  renderWeeklyGridSheet,
  renderWeeklyPlanner,
  renderWorkoutLog,
} from "./plannersTrackers";
import type { RenderContext } from "./types";

export function renderPaperTypeContent(ctx: RenderContext): string {
  const id = ctx.settings.paperType;
  switch (id) {
    case "lined":
      return renderHorizontalLines(ctx);
    case "vertical-lined":
      return renderVerticalLines(ctx);
    case "grid":
      return renderGrid(ctx);
    case "dot":
      return renderDotGrid(ctx);
    case "pink-millimeter-grid":
      return renderGrid(ctx, ctx.geom.contentBox, ctx.settings.lineSpacingMm, 5);
    case "sewing-pattern-grid":
      return renderGrid(ctx, ctx.geom.contentBox, ctx.settings.lineSpacingMm, 5);
    case "split-column":
      return renderSplitColumn(ctx);
    case "blank":
      return "";
    case "cornell-notes":
      return renderCornellNotes(ctx);
    case "seyes-grid":
      return renderSeyesGrid(ctx);
    case "storyboard":
      return renderStoryboard(ctx);
    case "cross-grid":
      return renderCrossGrid(ctx);
    case "student-note":
    case "meeting-note":
    case "minimal-journal":
    case "vintage-note":
    case "branded-paper":
    case "children-drawing":
    case "sketch-paper":
    case "creative-log":
      return renderStructuredNoteSheet(ctx, id);

    case "isometric-grid":
      return renderIsometricGrid(ctx);
    case "isometric-dot":
      return renderIsometricDot(ctx);
    case "perspective-grid":
      return renderPerspectiveGrid(ctx);
    case "hexagonal-grid":
      return renderHexagonalGrid(ctx);
    case "polar-grid":
      return renderPolarGrid(ctx);
    case "number-line":
      return renderNumberLine(ctx);
    case "semi-log-graph":
      return renderLogGraph(ctx, "semi-log");
    case "log-log-graph":
      return renderLogGraph(ctx, "log-log");
    case "arithmetic":
      return renderArithmeticPaper(ctx);
    case "ten-frames":
      return renderTenFrames(ctx);
    case "blank-clock-faces":
      return renderBlankClockFaces(ctx);
    case "fraction-bars":
      return renderFractionBars(ctx);
    case "knitting-graph":
      return renderKnittingGraph(ctx);

    case "music":
      return renderMusicPaper(ctx);
    case "guitar-tab":
      return renderGuitarTab(ctx);
    case "bass-tab":
      return renderBassTab(ctx);
    case "staff-ukulele-tab":
      return renderStaffUkuleleTab(ctx);
    case "treble-chord-diagrams":
      return renderTrebleChordDiagrams(ctx);

    case "calligraphy":
      return renderCalligraphyPaper(ctx);
    case "modern-calligraphy-slant":
      return renderModernCalligraphySlant(ctx);
    case "slant-ruled":
      return renderSlantRuled(ctx);
    case "mi-zi-ge":
    case "hui-gong-ge":
    case "jiu-gong-ge":
    case "chinese-tianzi":
    case "hardpen-hui-gong-ge":
    case "composition":
      return renderCharacterGrid(ctx, id);
    case "genko-yoshi":
      return renderGenkoYoshi(ctx);
    case "pinyin-practice":
    case "english-practice":
    case "english-handwriting":
    case "us-handwriting":
    case "us-handwriting-half":
    case "german-three-line":
    case "german-three-line-border":
    case "lineatur-3":
    case "brazilian-calligraphy":
      return renderFourLineBands(ctx, id);
    case "pinyin-tianzi":
      return renderPinyinTianzi(ctx);
    case "chinese-preview-card":
    case "chinese-english-word":
      return renderChineseStudySheet(ctx, id);
    case "practice-paper":
      return renderPracticePaper(ctx);
    case "braille-practice":
      return renderBraillePractice(ctx);
    case "error-correction":
      return renderErrorCorrection(ctx);

    case "daily-planner":
      return renderDailyPlanner(ctx);
    case "weekly-planner":
      return renderWeeklyPlanner(ctx);
    case "monthly-calendar":
      return renderMonthlyCalendar(ctx);
    case "task-planning":
      return renderTaskPlanning(ctx);
    case "project-planning":
      return renderProjectPlanning(ctx);
    case "weekly-checklist":
    case "weekly-meal-planner":
    case "medication-tracker":
      return renderWeeklyGridSheet(ctx, id);
    case "monthly-habit-tracker":
      return renderMonthlyHabitTracker(ctx);
    case "workout-log":
      return renderWorkoutLog(ctx);
    case "household-budget":
      return renderHouseholdBudget(ctx);
    case "swot-analysis":
      return renderSwotAnalysis(ctx);
    case "goal-thermometer":
      return renderGoalThermometer(ctx);
    case "recipe-cards":
      return renderRecipeCards(ctx);
  }
}
