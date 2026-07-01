import type { Option } from "src/sections/gre-panel/components/gre-table-toolbar";

export type IgreTablelistTableFilters = {
  name: string;
  id: string;
  projectName: string;
  sourcingRm?: string | number | Option | null;
  startDate: string | null; // Add this
  endDate: string | null;   // Add this
};