import type { PaperSettings } from "../../types/paper";
import type { SheetLayoutGeometry } from "../geometry";

export interface RenderContext {
  settings: PaperSettings;
  geom: SheetLayoutGeometry;
  lineColor: string;
  accentColor: string;
  textColor: string;
  bgColor: string;
}
