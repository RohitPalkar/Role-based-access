import { Box ,
  Stack,
  Button,
  Tooltip,
  Popover,
  Divider,
  Checkbox,
  MenuItem,
  useTheme,
  TextField,
  Typography,
  IconButton,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

 import { Iconify } from '../iconify';

import type { ColumnManagerProps } from './types';

export default function ColumnManager({
  filteredColumns,
  filteredDisplayItems,
  openPopover,
  columnSearch,
  allColumnsVisible,
  someColumnsVisible,
  setColumnSearch,
  toggleColumnVisibility,
  toggleGroupVisibility,
  handleResetColumns,
  handleToggleAllColumns,
  handleOpenPopover,
  handleClosePopover,
}: ColumnManagerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      {/* Column Toggle Button */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Manage columns">
          {isMobile ? (
            <IconButton
              color="inherit"
              onClick={handleOpenPopover}
            >
               <Box 
                 component="img" 
                 src="/assets/icons/Vector.svg?v=1" 
                 alt="Manage columns" 
                 sx={{ 
                   width: 16, 
                   height: 16,
                   display: 'block'
                 }} 
               />
            </IconButton>
          ) : (
            <Button
              color="inherit"
              onClick={handleOpenPopover}
              startIcon={
                <Box 
                  component="img" 
                  src="/assets/icons/Vector.svg?v=1" 
                  alt="Manage columns" 
                  sx={{ 
                    width: 16, 
                    height: 16,
                    display: 'block',
                    flexShrink: 0 
                  }} 
                />
              }
              sx={{ 
                typography: 'subtitle2',
                whiteSpace: 'nowrap',
                minWidth: 'auto',
                flexShrink: 0,
                px: 1,
                fontSize: 13
              }}
            >
            {uiText.common.columns}
            </Button>
          )}
        </Tooltip>
      </Box>

      {/* Popover */}
      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 260, p: 0 } }}
      >
        <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Columns</Typography>
        </Box>


        <Stack spacing={0.5} sx={{ px: 1, py: 0.5 }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ maxHeight: 300, overflow: 'auto', px: 1 }}>
          {filteredDisplayItems.map((item) => (
            <MenuItem 
              key={item.id} 
              sx={{ 
                typography: 'body2', 
                py: 1, 
                borderRadius: 1, 
                my: 0.5,
                fontWeight: item.type === 'group' ? 500 : 400
              }}
              onClick={() => {
                if (!item.disableToggle) {
                  if (item.type === 'group') {
                    toggleGroupVisibility(item.id);
                  } else {
                    toggleColumnVisibility(item.id);
                  }
                }
              }}
              disabled={item.disableToggle}
            >
              <Checkbox
                size="small"
                checked={item.visible}
                indeterminate={item.indeterminate}
                disabled={item.disableToggle}
                onClick={(e) => e.stopPropagation()}
                onChange={() => {
                  if (item.type === 'group') {
                    toggleGroupVisibility(item.id);
                  } else {
                    toggleColumnVisibility(item.id);
                  }
                }}
              />
              <Typography
                variant="body2"
                sx={{ 
                  ml: 1, 
                  color: item.disableToggle ? 'text.disabled' : 'text.primary',
                  fontWeight: item.type === 'group' ? 500 : 400
                }}
              >
                {item.label}
             
              </Typography>
            </MenuItem>
          ))}
          {filteredDisplayItems.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No columns found
              </Typography>
            </Box>
          )}
        </Box>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, pb: 1.5 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={handleToggleAllColumns}
          >
            <Checkbox
              size="small"
              checked={allColumnsVisible}
              indeterminate={someColumnsVisible}
              onClick={(e) => e.stopPropagation()}
              onChange={handleToggleAllColumns}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                ml: 1,
                cursor: 'pointer'
              }}
            >
              Show/Hide
            </Typography>
          </Box>

          <Button
            size="small"
            variant="text"
            onClick={handleResetColumns}
            sx={{ fontWeight: 500 }}
          >
            Reset
          </Button>
        </Box>
      </Popover>
    </>
  );
}