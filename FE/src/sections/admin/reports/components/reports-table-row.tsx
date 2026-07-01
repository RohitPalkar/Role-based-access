
import type { IReportsItem } from 'src/types/admin/feature/reports';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Button, Typography } from '@mui/material';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IReportsItem;
  selected: boolean;
}>;

const downloadFile = (filePath: any) => {
  window.open(`${CONFIG.site.s3BasePath}/${filePath}`, '_blank');
}

export function ReportsTableRow({ row, selected }: Props) {

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1} sx={{
      backgroundColor: row?.id == null ? '#f5f5f5' : 'inherit', // Gray background if no reports
    }}>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant='body2' color="inherit">
          {row?.statement}
        </Typography>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.month}</TableCell>



      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button variant='contained' className='primaryBtn'
            onClick={() => { downloadFile(row?.filePath) }}
            disabled={row?.id == null}>
            <Iconify icon="material-symbols:download" />
            Download
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  );
}
