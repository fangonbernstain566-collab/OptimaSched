import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HubIcon from '@mui/icons-material/Hub';
import AuditLogFilters from '../components/audit/AuditLogFilters';
import AuditLogTable from '../components/audit/AuditLogTable';
import AuditLogDetailsModal from '../components/audit/AuditLogDetailsModal';
import {
  exportAuditLogs,
  getAuditLogById,
  getAuditLogs,
  getAuditLogStats,
} from '../services/auditLogApi';

const INITIAL_FILTERS = {
  search: '',
  module: '',
  action: '',
  userRole: '',
  startDate: '',
  endDate: '',
  sort: 'newest',
};

const StatCard = ({ title, value, icon, badgeColor, caption }) => (
  <Paper
    sx={{
      p: 3,
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      minHeight: '160px',
      bgcolor: 'background.paper',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ p: 1, borderRadius: '12px', bgcolor: `${badgeColor}15`, color: badgeColor }}>
        {icon}
      </Box>
    </Box>
    <Box sx={{ mt: 2 }}>
      <Typography variant="h3" fontWeight="800" sx={{ color: '#1e293b', letterSpacing: '-1px' }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
        {caption}
      </Typography>
    </Box>
  </Paper>
);

const buildQuery = (filters, page, pageSize) => ({
  ...filters,
  page: String(page),
  pageSize: String(pageSize),
  search: filters.search || undefined,
  module: filters.module || undefined,
  action: filters.action || undefined,
  userRole: filters.userRole || undefined,
  startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`).toISOString() : undefined,
  endDate: filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`).toISOString() : undefined,
});

export default function AuditLogs() {
  const [stats, setStats] = useState({
    totalLogs: 0,
    todaysLogs: 0,
    activeUsersToday: 0,
    mostActiveModule: 'N/A',
  });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const dynamicOptions = useMemo(() => {
    const modules = Array.from(new Set(rows.map((row) => row.module).filter(Boolean))).sort();
    const actions = Array.from(new Set(rows.map((row) => row.action).filter(Boolean))).sort();
    const roles = Array.from(new Set(rows.map((row) => row.userRole).filter(Boolean))).sort();
    return { modules, actions, roles };
  }, [rows]);

  const loadStats = async () => {
    const data = await getAuditLogStats();
    setStats(data);
  };

  const loadLogs = async (nextPage = pagination.page, nextSize = pagination.pageSize, nextFilters = appliedFilters) => {
    setLoading(true);
    setError('');
    try {
      const payload = await getAuditLogs(buildQuery(nextFilters, nextPage, nextSize));
      setRows(payload.data || []);
      setPagination(payload.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadLogs(1, pagination.pageSize, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    loadLogs(1, pagination.pageSize, filters);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    loadLogs(1, pagination.pageSize, INITIAL_FILTERS);
  };

  const handleOpenDetails = async (row) => {
    setModalOpen(true);
    setSelectedId(row.id);
    setSelectedLog(row);

    try {
      const full = await getAuditLogById(row.id);
      setSelectedLog(full);
    } catch {
      // Keep row data if detail fetch fails.
    }
  };

  const handleExport = async (format) => {
    try {
      const blob = await exportAuditLogs(
        buildQuery(appliedFilters, 1, pagination.pageSize),
        format
      );

      const extension = format === 'excel' ? 'xls' : 'csv';
      const fileName = `audit-logs-${Date.now()}.${extension}`;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export audit logs.');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8fafc', mt: -4 }}>
      <Box sx={{ maxWidth: '1500px', mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          sx={{ mb: 3 }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Audit Logs
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Monitor user actions and sensitive system changes.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
              sx={{ borderRadius: '12px', textTransform: 'none' }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<TableChartIcon />}
              onClick={() => handleExport('excel')}
              sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}
            >
              Export Excel
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Logs"
              value={stats.totalLogs}
              icon={<DescriptionIcon />}
              badgeColor="#2563eb"
              caption="All recorded entries"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Today's Logs"
              value={stats.todaysLogs}
              icon={<TableChartIcon />}
              badgeColor="#7c3aed"
              caption="Entries logged today"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Users Today"
              value={stats.activeUsersToday}
              icon={<PeopleAltIcon />}
              badgeColor="#db2777"
              caption="Distinct actors"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Most Active Module"
              value={stats.mostActiveModule}
              icon={<HubIcon />}
              badgeColor="#ea580c"
              caption={`${stats.mostActiveModuleCount || 0} log entries today`}
            />
          </Grid>
        </Grid>

        <Paper sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <AuditLogFilters
            filters={filters}
            onChange={handleFilterChange}
            modules={dynamicOptions.modules}
            actions={dynamicOptions.actions}
            roles={dynamicOptions.roles}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AuditLogTable
            rows={rows}
            pagination={pagination}
            onPageChange={(nextPage) => loadLogs(nextPage, pagination.pageSize, appliedFilters)}
            onRowsPerPageChange={(e) => {
              const nextSize = parseInt(e.target.value, 10);
              loadLogs(1, nextSize, appliedFilters);
            }}
            onRowClick={handleOpenDetails}
          />
        )}

        <AuditLogDetailsModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedId(null);
            setSelectedLog(null);
          }}
          log={selectedId ? selectedLog : null}
        />
      </Box>
    </Box>
  );
}
