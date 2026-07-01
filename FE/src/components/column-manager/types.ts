import type { ColumnDefinition } from 'src/hooks/use-column-manager';

export interface DisplayItem {
  id: string;
  label: string;
  type: 'group' | 'column';
  visible: boolean;
  disableToggle?: boolean;
  indeterminate?: boolean;
}

export type ColumnManagerProps = Readonly<{
  columns: ColumnDefinition[];
  filteredColumns: ColumnDefinition[];
  filteredDisplayItems: DisplayItem[];
  openPopover: HTMLElement | null;
  columnSearch: string;
  allColumnsVisible: boolean;
  someColumnsVisible: boolean;
  setColumnSearch: (search: string) => void;
  toggleColumnVisibility: (id: string) => void;
  toggleGroupVisibility: (groupName: string) => void;
  getGroups: () => string[];
  getGroupVisibility: (groupName: string) => {
    allVisible: boolean;
    someVisible: boolean;
    noneVisible: boolean;
  };
  handleResetColumns: () => void;
  handleToggleAllColumns: () => void;
  handleOpenPopover: (event: React.MouseEvent<HTMLElement>) => void;
  handleClosePopover: () => void;
}>;