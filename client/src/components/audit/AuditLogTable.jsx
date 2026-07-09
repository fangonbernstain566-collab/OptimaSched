import React from 'react';
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export default function AuditLogTable({
  rows,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
}) {
  return (
    <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              {['Date & Time', 'User', 'Role', 'Module', 'Action', 'Description', 'Target', 'IP Address'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                  No audit logs found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onRowClick(row)}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.createdAt)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.userName || 'System'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.userRole || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.module || '-'}
                      sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.action}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography noWrap variant="body2">
                      {row.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.targetRecordName || row.targetRecordId || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.ipAddress || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={pagination.total}
        page={Math.max(pagination.page - 1, 0)}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 20, 50, 100]}
      />
    </Paper>
  );
}
