import React from 'react';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'user', label: 'User' },
  { value: 'module', label: 'Module' },
];

export default function AuditLogFilters({
  filters,
  onChange,
  modules,
  actions,
  roles,
  onApply,
  onReset,
}) {
  return (
    <Stack spacing={2.5} sx={{ mb: 3 }}>
      <TextField
        label="Search"
        placeholder="Search by user, module, action, description..."
        fullWidth
        value={filters.search}
        onChange={(e) => onChange('search', e.target.value)}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          select
          label="Module"
          fullWidth
          value={filters.module}
          onChange={(e) => onChange('module', e.target.value)}
        >
          <MenuItem value="">All Modules</MenuItem>
          {modules.map((module) => (
            <MenuItem key={module} value={module}>
              {module}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Action"
          fullWidth
          value={filters.action}
          onChange={(e) => onChange('action', e.target.value)}
        >
          <MenuItem value="">All Actions</MenuItem>
          {actions.map((action) => (
            <MenuItem key={action} value={action}>
              {action}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Role"
          fullWidth
          value={filters.userRole}
          onChange={(e) => onChange('userRole', e.target.value)}
        >
          <MenuItem value="">All Roles</MenuItem>
          {roles.map((role) => (
            <MenuItem key={role} value={role}>
              {role}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Sort"
          fullWidth
          value={filters.sort}
          onChange={(e) => onChange('sort', e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={filters.startDate}
          onChange={(e) => onChange('startDate', e.target.value)}
        />

        <TextField
          label="End Date"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={filters.endDate}
          onChange={(e) => onChange('endDate', e.target.value)}
        />

        <Box sx={{ display: 'flex', gap: 1, minWidth: { xs: '100%', md: 220 } }}>
          <Button variant="contained" fullWidth onClick={onApply}>
            Apply
          </Button>
          <Button variant="outlined" fullWidth onClick={onReset}>
            Reset
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
