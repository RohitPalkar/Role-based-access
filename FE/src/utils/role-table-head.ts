import type { RoleColumn } from 'src/config/role-based-permissions';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';

/**
 * Maps role-based-permissions column config to table column definitions.
 * Single place list views call so columns/filters stay driven from ROLE_BASED_PERMISSIONS.
 */
export function roleColumnsToDefinitions(columns: RoleColumn[] | null | undefined): ColumnDefinition[] {
  if (!columns?.length) return [];
  return columns
    .filter(
      (col): col is RoleColumn =>
        col != null &&
        typeof col === 'object' &&
        typeof col.id === 'string' &&
        col.id.length > 0
    )
    .map((col) => ({
      id: col.id,
      label: col.label ?? col.id,
      width: col.width ?? 150,
      visible: col.visible !== false,
      sortable: col.sortable === true,
      disableToggle: col.disableToggle,
      tooltip: col.tooltip,
      ...(col.group ? { group: col.group } : {}),
    }));
}
