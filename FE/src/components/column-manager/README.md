# Column Manager Component

A reusable component for managing column visibility in tables.

## Features

- Toggle column visibility
- Search for columns
- Show/hide all columns
- Reset columns to default state
- Responsive design

## Usage

### 1. Import the necessary components and hooks

```tsx
import { ColumnManager } from 'src/components/column-manager';
import { useColumnManager, ColumnDefinition } from 'src/hooks/use-column-manager';
```

### 2. Define your table columns

```tsx
const TABLE_HEAD: ColumnDefinition[] = [
  { id: 'name', label: 'Name', width: 200, visible: true },
  { id: 'email', label: 'Email', width: 200, visible: true },
  { id: 'phone', label: 'Phone', width: 150, visible: true },
  { id: 'status', label: 'Status', width: 100, visible: true, disableToggle: true }, // Cannot be toggled
  { id: 'createdAt', label: 'Created At', width: 150, visible: true },
];
```

### 3. Use the column manager hook in your component

```tsx
function YourTableComponent() {
  // Use the column manager hook
  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  
  // Rest of your component...
  
  return (
    <div>
      {/* Add the ColumnManager component */}
      <ColumnManager {...columnManager} />
      
      {/* Use visibleColumns in your table head */}
      <TableHeadCustom
        headLabel={visibleColumns}
        // other props...
      />
      
      {/* In your table rows, check column visibility */}
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            {columnManager.columns.find(col => col.id === 'name')?.visible && (
              <TableCell>{row.name}</TableCell>
            )}
            {/* Other cells... */}
          </TableRow>
        ))}
      </TableBody>
    </div>
  );
}
```

## API

### ColumnDefinition

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier for the column |
| label | string | Display label for the column |
| width | number | (Optional) Width of the column |
| visible | boolean | Whether the column is visible |
| disableToggle | boolean | (Optional) If true, the column cannot be toggled |

### useColumnManager Hook

Returns an object with the following properties and methods:

| Name | Type | Description |
|------|------|-------------|
| columns | ColumnDefinition[] | All columns with their current state |
| visibleColumns | ColumnDefinition[] | Only the visible columns |
| filteredColumns | ColumnDefinition[] | Columns filtered by search |
| openPopover | HTMLElement \| null | Current popover anchor element |
| columnSearch | string | Current search term |
| allColumnsVisible | boolean | Whether all toggleable columns are visible |
| someColumnsVisible | boolean | Whether some toggleable columns are visible |
| setColumnSearch | (search: string) => void | Set the search term |
| toggleColumnVisibility | (id: string) => void | Toggle visibility of a column |
| handleResetColumns | () => void | Reset columns to initial state |
| handleShowAllColumns | () => void | Show all columns |
| handleHideAllColumns | () => void | Hide all columns |
| handleToggleAllColumns | () => void | Toggle between show all and hide all |
| handleOpenPopover | (event: React.MouseEvent<HTMLElement>) => void | Open the popover |
| handleClosePopover | () => void | Close the popover |

## Example

See the full example in `/src/sections/examples/reusable-table-example.tsx`