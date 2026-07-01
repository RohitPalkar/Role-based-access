import type { IPhaseItem } from 'src/types/admin/feature/phase';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import { useRef, useState } from 'react';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Box, Tooltip, MenuList, MenuItem, IconButton } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { formatToDDMMYYYY } from 'src/utils/helper';

import { editPhase } from 'src/services/admin-services/phase-service';

import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { PhaseEditPopover } from './phase-edit-popover';
// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IPhaseItem;
  selected: boolean;
  onRefresh: () => void;
  visibleColumns?: ColumnDefinition[];
}>;



export function PhaseTableRow({ row, selected, onRefresh, visibleColumns }: Props) {
  const [open, setOpen] = useState(false);
    const router = useRouter();
    const panelPaths = useAdminPanelPaths();
    const menuActions = usePopover();
  
  // Determine initial skipLaunch state based on existing data
  const getInitialSkipLaunch = () => {
    if (row?.sustenanceDate && (!row?.launchStartDate || !row?.launchEndDate)) {
      return true; // Has sustenance date but no launch range
    }
    if (row?.launchStartDate && row?.launchEndDate && !row?.sustenanceDate) {
      return false; // Has launch range but no sustenance date
    }
    return row?.skipLaunch ?? false; // Use existing value or default to false
  };
  
  const [skipLaunch, setSkipLaunch] = useState(getInitialSkipLaunch());
  const [sustenanceDate, setSustenanceDate] = useState(row?.sustenanceDate ?? '');
  const [launchStartDate, setLaunchStartDate] = useState(row?.launchStartDate ?? '');
  const [launchEndDate, setLaunchEndDate] = useState(row?.launchEndDate ?? '');
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const handleEditLaunchPhase = () => {
    // Reset values to current row values when opening
    setSkipLaunch(getInitialSkipLaunch());
    setSustenanceDate(row?.sustenanceDate ?? '');
    setLaunchStartDate(row?.launchStartDate ?? '');
    setLaunchEndDate(row?.launchEndDate ?? '');
    setOpen(true);
  };

  const handleEditPhase = () => {
        router.push(panelPaths.phase?.edit(row?.id.toString())); // redirect to edit phase page
  }

  // Check if edit should be disabled - disable if phase has launch date range OR sustenance date
  const isEditDisabled = () => {
    const hasLaunchRange = !!(row?.launchStartDate && row?.launchEndDate);
    const hasSustenanceDate = !!row?.sustenanceDate;
    return hasLaunchRange || hasSustenanceDate;
  };
  

  const handleApply = async () => {
    try {
      const payload: any = {};

      // Always include skipLaunch in payload
      payload.skipLaunch = skipLaunch;

      // Include launch dates if launch is not skipped
      if (!skipLaunch) {
        payload.launchStartDate = launchStartDate?.trim() || null;
        payload.launchEndDate = launchEndDate?.trim() || null;
      }

      // Include sustenanceDate in payload
      const newSustenanceDate = sustenanceDate?.trim() || null;
      payload.sustenanceDate = newSustenanceDate;

      await editPhase(row?.id, payload);

      setOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to update phase:', error?.message || error);
    }
  };

  const isColumnVisible = (columnId: string) => {
    if (!visibleColumns) return true;
    return visibleColumns.some((col) => col.id === columnId && col.visible);
  };

  const renderCell = (columnId: string, content: React.ReactNode) => {
    if (!isColumnVisible(columnId)) return null;
    return <TableCell sx={{ whiteSpace: 'nowrap' }}>{content}</TableCell>;
  };


  // render menu  actions
   const renderMenuActions = () => (
      <CustomPopover
        open={menuActions.open}
        anchorEl={menuActions.anchorEl}
        onClose={menuActions.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
            <MenuItem
            onClick={handleEditPhase}
          >
            {/* <Iconify icon="solar:export-bold" /> */}
            Edit Phase
          </MenuItem>
          <MenuItem
            onClick={handleEditLaunchPhase}
            disabled={isEditDisabled()}
          >
            Edit Launch Phase
          </MenuItem>
  
        
        </MenuList>
      </CustomPopover>
    );

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        {renderCell('name', row?.name ?? '-')}
        {renderCell('project', row?.project ?? '-')}
        {renderCell('isLaunch', row?.isLaunch === true ? 'Y' : 'X')}
        {renderCell('isSustenance', row?.isSustenance === true ? 'Y' : 'X')}
        {renderCell(
          'launchDateRange',
          row?.launchStartDate && row?.launchEndDate
          ? `${formatToDDMMYYYY(row.launchStartDate)} to ${formatToDDMMYYYY(row.launchEndDate)}`
          : '-'
        )}
        {renderCell('sustenanceDate', formatToDDMMYYYY(row?.sustenanceDate || '-'))}
        {renderCell('possessionDate', formatToDDMMYYYY(row?.possessionDate || '-'))}
        {renderCell('brand', row?.brand ?? '-')}
        {renderCell('city', row?.city ?? '-')}
        {isColumnVisible('edit') && (
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* <Tooltip title="Edit" placement="top" arrow enterTouchDelay={0}>
                <IconButton
                  ref={anchorRef}
                  onClick={handleEdit}
                  color={open ? 'inherit' : 'default'}
                  disabled={isEditDisabled()}
                >
                  <Iconify icon="solar:pen-bold"  sx={{ color: isEditDisabled() ? 'disabled.text' : 'black' }}/>
                </IconButton>
              </Tooltip> */}
               <Tooltip title="Action">
                  <IconButton 
                   ref={anchorRef}  
                    onClick={menuActions.onOpen}
                    size="small"
                  >
                    <Iconify icon="eva:more-vertical-fill" />
                  </IconButton>
                </Tooltip>
            </Box>
          </TableCell>
        )}
      </TableRow>
      <PhaseEditPopover
        open={open}
        anchorEl={anchorRef?.current}
        onClose={() => setOpen(false)}
        onApply={handleApply}
        skipLaunch={skipLaunch}
        sustenanceDate={sustenanceDate}
        launchStartDate={launchStartDate}
        launchEndDate={launchEndDate}
        onSkipLaunchChange={setSkipLaunch}
        onSustenanceDateChange={(date) => setSustenanceDate(date || '')}
        onLaunchStartDateChange={(date) => setLaunchStartDate(date || '')}
        onLaunchEndDateChange={(date) => setLaunchEndDate(date || '')}
      />
      {renderMenuActions()}
    </>
  );
}
