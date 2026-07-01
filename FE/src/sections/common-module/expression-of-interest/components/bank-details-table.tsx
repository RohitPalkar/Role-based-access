import React from 'react';

import {
  Box,
  Card,
  Table,
  TableRow,
  TableBody,
  TableCell,
  Typography,
  TableContainer,
} from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

interface BankDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  swiftCode?: string;
}

interface BankDetailsTableProps {
  bankDetails?: BankDetails;
}
const jsonValue = uiText.EOIJson.createEOI.form.moreDetails.bankDetailsTable;

const BankDetailsTable: React.FC<BankDetailsTableProps> = ({ bankDetails }) => (
  <Card sx={{ mb: 1, borderRadius: 0 }}>
    <TableContainer sx={{}}>
      <Table sx={{}}>
        <TableBody>
          <TableRow sx={{ border: '1px solid #E0E0E0' }}>
            <TableCell sx={{ width: '50%' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {jsonValue.label.bankName}
              </Typography>
            </TableCell>
            <Box sx={{ borderLeft: '1px solid #E0E0E0 ' }}>
              <TableCell sx={{ width: '50%' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {bankDetails?.bankName}
                </Typography>
              </TableCell>
            </Box>
          </TableRow>
          <TableRow sx={{ border: '1px solid #E0E0E0' }}>
            <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
              {jsonValue.label.accName}
            </TableCell>
            <Box sx={{ borderLeft: '1px solid #E0E0E0 ' }}>
              <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
                {bankDetails?.accountName}
              </TableCell>{' '}
            </Box>
          </TableRow>
          <TableRow sx={{ border: '1px solid #E0E0E0' }}>
            <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
              {jsonValue.label.accNumber}
            </TableCell>
            <Box sx={{ borderLeft: '1px solid #E0E0E0 ' }}>
              <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
                {bankDetails?.accountNumber}
              </TableCell>{' '}
            </Box>
          </TableRow>
          <TableRow sx={{ border: '1px solid #E0E0E0' }}>
            <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
              {jsonValue.label.ifscCode}
            </TableCell>
            <Box sx={{ borderLeft: '1px solid #E0E0E0 ' }}>
              <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
                {bankDetails?.ifscCode}
              </TableCell>
            </Box>
          </TableRow>
          {bankDetails?.swiftCode && (
            <TableRow>
              <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
                {jsonValue.label.swiftCode}
              </TableCell>
              <TableCell sx={{ fontSize: '14px', fontWeight: 500 }}>
                {bankDetails?.swiftCode}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Card>
);

export default BankDetailsTable;
