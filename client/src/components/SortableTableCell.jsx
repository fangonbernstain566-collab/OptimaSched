import React from 'react';
import { TableCell, TableSortLabel, Box } from '@mui/material';

// Shared tri-state sort header used by Manage Teachers / Manage Rooms.
// Cycles asc -> desc -> unsorted on each click, matching the
// TableSortLabel affordance MUI already ships (no custom arrow icons needed).
export default function SortableTableCell({ label, sortKey, sortBy, order, onSort, align, sx }) {
  const isActive = sortBy === sortKey;

  const handleClick = () => {
    if (!isActive) return onSort(sortKey, 'asc');
    if (order === 'asc') return onSort(sortKey, 'desc');
    return onSort(null, null); // third click: back to default (no sorting)
  };

  return (
    <TableCell align={align} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', ...sx }}>
      <TableSortLabel
        active={isActive}
        direction={isActive ? order : 'asc'}
        onClick={handleClick}
        sx={{ '&:hover': { opacity: 0.8 } }}
      >
        <Box component="span">{label}</Box>
      </TableSortLabel>
    </TableCell>
  );
}
