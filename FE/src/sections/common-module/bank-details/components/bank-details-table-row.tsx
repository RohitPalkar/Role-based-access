import type { RoleAction } from 'src/config/role-based-permissions';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { BankDetailsListData } from 'src/services/rm-panel/bank-details-service';

import React, { useRef, useState } from 'react';

import IosShareIcon from '@mui/icons-material/IosShare';
import { Box, Tooltip, TableRow, MenuList, MenuItem, TableCell, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { ShareBankDetailsDialog } from './share-bank-details-dialog';

type Props = {
  row: BankDetailsListData;
  visibleColumns: ColumnDefinition[];
  roleActions: RoleAction[];
};

const BankDetailsTableRow: React.FC<Props> = ({ row, visibleColumns, roleActions }) => {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const menuActions = usePopover();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const handleCloseShareDialog = () => {
    setShowShareDialog(false);
  };

  const getDisplayValue = (value?: number | string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && value === 0) return '-';
    return value;
  };

  const handleShareBankDetails = () => {
    setShowShareDialog(true);
    menuActions.onClose();
  };
  // render menu  actions
  const actionHandlers: Record<string, () => void> = {
    share: handleShareBankDetails,
  };

  const hasShareAction = roleActions?.some((action) => action.id === 'share');

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        {roleActions?.map((action, index) => (
          <MenuItem
            key={action?.id}
            onClick={() => {
              actionHandlers[action?.id || index]?.();
              menuActions.onClose();
            }}
          >
            {action?.label}
          </MenuItem>
        ))}
      </MenuList>
    </CustomPopover>
  );
  return (
    <>
      <TableRow hover tabIndex={-1} sx={{ height: 8 }}>
        {visibleColumns.map((col) => {
          const value = row[col.id as keyof BankDetailsListData];

          if (col.id === 'action' && roleActions.length > 0) {
            return (
              <TableCell key={col.id}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                 {hasShareAction ? (
                    <Tooltip title="Share">
                      <IconButton onClick={handleShareBankDetails} size="small">
                        <IosShareIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Action">
                      <IconButton ref={anchorRef} onClick={menuActions.onOpen} size="small">
                        <Iconify icon="eva:more-vertical-fill" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            );
          }

          // DEFAULT cell
          return <TableCell key={col.id}>{getDisplayValue(value)}</TableCell>;
        })}
        {renderMenuActions()}
      </TableRow>
      <ShareBankDetailsDialog
        open={showShareDialog}
        campaignId={row?.campaignId}
        onClose={handleCloseShareDialog}
        title="Share"
      />
    </>
  );
};
export default BankDetailsTableRow;
