import { useRef, useState, useEffect, useCallback } from 'react';

export interface ColumnDefinition {
  id: string;
  label: string | React.ReactNode;
  width?: number;
  visible: boolean;
  disableToggle?: boolean;
  sortable?: boolean;
  tooltip?: string;
  group?: string;
  tab?: string;
}

export function useColumnManager(initialColumns: ColumnDefinition[]) {
  const [columns, setColumns] = useState<ColumnDefinition[]>(initialColumns);
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);
  const [columnSearch, setColumnSearch] = useState('');
  const initialColumnsSignatureRef = useRef<string>('');

  // Keep column state in sync when the role/config column set changes (e.g. role hydrates after first paint).
  useEffect(() => {
    const sig = JSON.stringify(
      initialColumns.map((c) => ({
        id: c?.id,
        v: c?.visible,
        g: c?.group,
      }))
    );
    if (initialColumnsSignatureRef.current !== sig) {
      initialColumnsSignatureRef.current = sig;
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  // Toggle visibility of a specific column
  const toggleColumnVisibility = useCallback((id: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col?.id === id && !col?.disableToggle ? { ...col, visible: !col?.visible } : col
      )
    );
  }, []);

  // Toggle visibility of a group (affects all columns in the group)
  const toggleGroupVisibility = useCallback((groupName: string) => {
    setColumns((prev) => {
      const groupColumns = prev.filter(col => col.group === groupName);
      const allGroupVisible = groupColumns.every(col => col.visible);
      
      return prev.map((col) => {
        if (col.group === groupName && !col.disableToggle) {
          return { ...col, visible: !allGroupVisible };
        }
        return col;
      });
    });
  }, []);

  // Reset columns to initial state
  const handleResetColumns = useCallback(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  // Show all columns
  const handleShowAllColumns = useCallback(() => {
    setColumns((prev) =>
      prev.map((col) => (col?.disableToggle ? col : { ...col, visible: true }))
    );
  }, []);

  // Hide all columns
  const handleHideAllColumns = useCallback(() => {
    setColumns((prev) =>
      prev.map((col) => (col?.disableToggle ? col : { ...col, visible: false }))
    );
  }, []);

  // Toggle between show all and hide all
  const handleToggleAllColumns = useCallback(() => {
    const allVisible = columns.every(col => col?.disableToggle || col?.visible);
    if (allVisible) {
      handleHideAllColumns();
    } else {
      handleShowAllColumns();
    }
  }, [columns, handleHideAllColumns, handleShowAllColumns]);

  // Popover management
  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
    setColumnSearch('');
  }, []);

  // Get unique groups
  const getGroups = useCallback(() => {
    const groups = new Set<string>();
    columns.forEach(col => {
      if (col.group) {
        groups.add(col.group);
      }
    });
    return Array.from(groups);
  }, [columns]);

  // Get group visibility status
  const getGroupVisibility = useCallback((groupName: string) => {
    const groupColumns = columns.filter(col => col.group === groupName);
    const visibleCount = groupColumns.filter(col => col.visible).length;
    
    return {
      allVisible: visibleCount === groupColumns.length,
      someVisible: visibleCount > 0 && visibleCount < groupColumns.length,
      noneVisible: visibleCount === 0
    };
  }, [columns]);

  // Create display items for column manager (groups + individual columns)
  const getDisplayItems = useCallback(() => {
    const items: Array<{
      id: string;
      label: string;
      type: 'group' | 'column';
      visible: boolean;
      disableToggle?: boolean;
      indeterminate?: boolean;
    }> = [];

    const processedGroups = new Set<string>();
    const processedColumns = new Set<string>();

    // Add groups first
    columns.forEach(col => {
      if (col.group && !processedGroups.has(col.group)) {
        const groupVisibility = getGroupVisibility(col.group);
        items.push({
          id: col.group,
          label: col.group,
          type: 'group',
          visible: groupVisibility.allVisible,
          indeterminate: groupVisibility.someVisible,
          disableToggle: false
        });
        processedGroups.add(col.group);
        
        // Mark all columns in this group as processed
        columns.filter(c => c.group === col.group).forEach(c => {
          processedColumns.add(c.id);
        });
      }
    });

    // Add individual columns that are not in groups
    columns.forEach(col => {
      if (!col.group && !processedColumns.has(col.id)) {
        items.push({
          id: col.id,
          label: typeof col.label === 'string' ? col.label : col.id,
          type: 'column',
          visible: col.visible,
          disableToggle: col.disableToggle
        });
        processedColumns.add(col.id);
      }
    });

    return items;
  }, [columns, getGroupVisibility]);

  // Filter display items based on search
  const filteredDisplayItems = getDisplayItems().filter((item) => item.label.toLowerCase().includes(columnSearch.toLowerCase()));

  // Filter columns based on search (for backward compatibility)
  const filteredColumns = columns.filter((col) => {
    if (typeof col?.label === 'string') {
      return col.label.toLowerCase().includes(columnSearch.toLowerCase());
    }
    // For React.ReactNode labels, we can't search them, so include them if no search term
    return columnSearch === '';
  });

  // Get only visible columns
  const visibleColumns = columns.filter((col) => col?.visible);

  // Check if all toggleable columns are visible
  const allColumnsVisible = columns.every(col => col?.disableToggle || col?.visible);
  
  // Check if some toggleable columns are visible (for indeterminate state)
  const someColumnsVisible = columns.some(col => !col?.disableToggle && col?.visible) &&
    !columns.every(col => col?.disableToggle || col?.visible);

  return {
    columns,
    visibleColumns,
    filteredColumns,
    filteredDisplayItems,
    openPopover,
    columnSearch,
    allColumnsVisible,
    someColumnsVisible,
    setColumnSearch,
    toggleColumnVisibility,
    toggleGroupVisibility,
    getGroups,
    getGroupVisibility,
    handleResetColumns,
    handleShowAllColumns,
    handleHideAllColumns,
    handleToggleAllColumns,
    handleOpenPopover,
    handleClosePopover,
  };
}