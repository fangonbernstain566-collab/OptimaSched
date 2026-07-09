import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import SortableTableCell from '../components/SortableTableCell';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Modal, TextField, Stack,
  IconButton, Tooltip, Divider, CircularProgress, TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
} from '@mui/icons-material';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const INITIAL_FORM = {
  firstName:       '',
  lastName:        '',
  email:           '',
  maxTeachingLoad: 15,
  departmentName:  'Information Technology Dept',
};

export default function TeacherManager() {
  const navigate = useNavigate();
  const [teachers, setTeachers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [open, setOpen]             = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [sort, setSort]             = useState({ sortBy: null, order: null });

  const { toast, showToast, hideToast } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    fetchTeachers(1, pagination.pageSize, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeachers = async (page = pagination.page, pageSize = pagination.pageSize, sortState = sort) => {
    try {
      setLoading(true);
      const config = getAuthHeaders();
      const response = await axios.get('/api/teachers', {
        ...config,
        params: {
          page,
          pageSize,
          ...(sortState.sortBy ? { sortBy: sortState.sortBy, order: sortState.order } : {}),
        },
      });
      if (response.data.success) {
        setTeachers(response.data.data);
        setPagination(response.data.pagination ?? { page, pageSize, total: response.data.data.length, totalPages: 1 });
      }
    } catch (error) {
      showToast(
        error.response?.data?.message ?? 'Failed to load instructor roster.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Cycles asc -> desc -> unsorted; resets to page 1 (a new sort order changes
  // what belongs on "page 1"), but keeps the current page size.
  const handleSort = (sortBy, order) => {
    const nextSort = { sortBy, order };
    setSort(nextSort);
    fetchTeachers(1, pagination.pageSize, nextSort);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData(INITIAL_FORM);
    setOpen(true);
  };

  const openEdit = (teacher) => {
    setEditTarget(teacher);
    setFormData({
      firstName:       teacher.user?.firstName ?? '',
      lastName:        teacher.user?.lastName ?? '',
      email:           teacher.user?.email ?? '',
      maxTeachingLoad: teacher.maxTeachingLoad ?? 15,
      departmentName:  teacher.department?.name ?? '',
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditTarget(null);
    setFormData(INITIAL_FORM);
  };

  const handleCreate = async () => {
    try {
      const response = await axios.post('/api/teachers', formData, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Instructor registered successfully!', 'success');
        closeModal();
        fetchTeachers(1, pagination.pageSize);
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to save instructor profile.', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await axios.put(`/api/teachers/${editTarget.id}`, formData, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Instructor profile updated!', 'success');
        closeModal();
        fetchTeachers(pagination.page, pagination.pageSize);
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to update instructor profile.', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    editTarget ? handleUpdate() : handleCreate();
  };

  const askDelete = (id) => { setDeleteId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    try {
      const response = await axios.delete(`/api/teachers/${deleteId}`, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Teacher deleted successfully.', 'success');
        setDeleteOpen(false);
        setDeleteId(null);
        const isLastRowOnPage = teachers.length === 1 && pagination.page > 1;
        fetchTeachers(isLastRowOnPage ? pagination.page - 1 : pagination.page, pagination.pageSize);
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to delete teacher.', 'error');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: 'background.default', mt: -4 }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1300px', mx: 'auto' }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>
              Manage Teachers
            </Typography>
            <Typography color="text.secondary">
              Onboard and manage instructor profiles for schedule assignment.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            <Button
              variant="outlined"
              startIcon={<RestoreFromTrashIcon />}
              onClick={() => navigate('/teachers/recently-deleted')}
              sx={{ borderRadius: '12px', textTransform: 'none' }}
            >
              Recently Deleted
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}
            >
              Register New Teacher
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ borderRadius: '16px' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <SortableTableCell label="Name" sortKey="lastName" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                    <SortableTableCell label="Academic Email Address" sortKey="email" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                    <SortableTableCell label="Assigned Department" sortKey="department" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                    <SortableTableCell label="Max Units Load" sortKey="maxTeachingLoad" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                    <SortableTableCell label="Date Registered" sortKey="createdAt" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                        No active instructors registered in the database system yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teachers.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {t.user?.firstName} {t.user?.lastName}
                        </TableCell>
                        <TableCell>{t.user?.email}</TableCell>
                        <TableCell>{t.department?.name || 'General Education'}</TableCell>
                        <TableCell>{t.maxTeachingLoad} Units</TableCell>
                        <TableCell>{formatDate(t.user?.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(t)} sx={{ color: '#2563eb' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => askDelete(t.id)} sx={{ color: '#ef4444' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
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
              onPageChange={(_, newPage) => fetchTeachers(newPage + 1, pagination.pageSize)}
              rowsPerPage={pagination.pageSize}
              onRowsPerPageChange={(e) => fetchTeachers(1, parseInt(e.target.value, 10))}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Paper>
        )}

        {/* Create / Edit Modal */}
        <Modal open={open} onClose={closeModal}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            p: 4, bgcolor: 'background.paper', width: '100%',
            maxWidth: '440px', borderRadius: '20px',
          }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>
              {editTarget ? 'Edit Instructor Profile' : 'Onboard New Academic Faculty'}
            </Typography>

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="First Name" name="firstName" fullWidth required
                  value={formData.firstName} onChange={handleInputChange}
                />
                <TextField
                  label="Last Name" name="lastName" fullWidth required
                  value={formData.lastName} onChange={handleInputChange}
                />
                <TextField
                  label="Email Address" name="email" type="email" fullWidth required
                  value={formData.email} onChange={handleInputChange}
                  disabled={!!editTarget}
                  helperText={editTarget ? 'Email cannot be changed after registration.' : ''}
                />
                <TextField
                  label="Target Department" name="departmentName" fullWidth required
                  value={formData.departmentName} onChange={handleInputChange}
                />
                <TextField
                  label="Max Teaching Unit Load" name="maxTeachingLoad" type="number" fullWidth required
                  value={formData.maxTeachingLoad} onChange={handleInputChange}
                  inputProps={{ min: 1 }}
                />

                <Button fullWidth variant="contained" type="submit"
                  sx={{ py: 1.5, bgcolor: '#2563eb', borderRadius: '10px', textTransform: 'none' }}>
                  {editTarget ? 'Update Profile' : 'Save Profile'}
                </Button>
              </Stack>
            </form>
          </Box>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            p: 4, bgcolor: 'background.paper', width: '100%',
            maxWidth: '400px', borderRadius: '20px', textAlign: 'center',
          }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
              Delete Teacher?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              This cannot be undone. Teachers already assigned to schedules cannot be deleted.
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => setDeleteOpen(false)}
                sx={{ borderRadius: '10px', textTransform: 'none', px: 3 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={confirmDelete}
                sx={{ bgcolor: '#ef4444', borderRadius: '10px', textTransform: 'none', px: 3,
                  '&:hover': { bgcolor: '#dc2626' } }}>
                Delete Teacher
              </Button>
            </Box>
          </Box>
        </Modal>

      </Box>
    </Box>
  );
}
