import type { ReactNode } from 'react';
import type { Theme, SxProps, CSSObject } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type TableHeadCellProps = {
  id: string;
  label?: string | ReactNode;
  sortable?: boolean;
  width?: CSSObject['width'];
  align?: 'left' | 'center' | 'right';
  sx?: SxProps<Theme>;
  tooltip?: string;
  group?: string; // Optional property for grouping
  visible?: boolean;
  disableToggle?: boolean;
};

export type TableProps = {
  dense: boolean;
  page: number;
  rowsPerPage: number;
  order: 'asc' | 'desc';
  orderBy: string;
  //
  selected: string[];
  onSelectRow: (id: string) => void;
  onSelectAllRows: (checked: boolean, newSelecteds: string[]) => void;
  //
  onResetPage: () => void;
  onSort: (id: string) => void;
  onChangePage: (event: unknown, newPage: number) => void;
  onChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeDense: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdatePageDeleteRow: (totalRowsInPage: number) => void;
  onUpdatePageDeleteRows: ({
    totalRowsInPage,
    totalRowsFiltered,
  }: {
    totalRowsInPage: number;
    totalRowsFiltered: number;
  }) => void;
  //
  visibleColumns: Record<string, boolean>;
  isColumnVisible: (columnId: string, defaultVisible?: boolean) => boolean;
  onToggleColumnVisibility: (columnId: string) => void;
  onSetColumnVisibility: (columnId: string, visible: boolean) => void;
  onSetAllColumnsVisibility: (visible: boolean, columnIds: string[]) => void;
  //
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setDense: React.Dispatch<React.SetStateAction<boolean>>;
  setOrder: React.Dispatch<React.SetStateAction<'desc' | 'asc'>>;
  setOrderBy: React.Dispatch<React.SetStateAction<string>>;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};
