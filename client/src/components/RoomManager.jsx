// client/src/components/RoomManager.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, MenuItem, Modal, Paper, Stack,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
  IconButton, Tooltip, Divider, TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
} from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import SortableTableCell from '../components/SortableTableCell';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const ROOM_TYPES = [
  { value: 'LECTURE_ROOM',        label: 'Lecture Room'        },
  { value: 'COMPUTER_LABORATORY', label: 'Computer Laboratory' },
  { value: 'LABORATORY',          label: 'Laboratory'          },
];

const INITIAL_FORM = {
  name:              '',
  capacity:          40,
  type:              'LECTURE_ROOM',
  buildingName:      'Main Building',
  allowedCategories: '',
};

export default function RoomManager() {
  const navigate = useNavigate();
  const [rooms, setRooms]           = useState([]);
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

  const fetchRooms = async (page = pagination.page, pageSize = pagination.pageSize, sortState = sort) => {
    try {
      const config = getAuthHeaders();
      const response = await axios.get('/api/rooms', {
        ...config,
        params: {
          page,
          pageSize,
          ...(sortState.sortBy ? { sortBy: sortState.sortBy, order: sortState.order } : {}),
        },
      });
      if (response.data.success) {
        const data = response.data.data || [];
        setRooms(data);
        setPagination(response.data.pagination ?? { page, pageSize, total: data.length, totalPages: 1 });
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to fetch rooms.', 'error');
    }
  };

  useEffect(() => { fetchRooms(1, pagination.pageSize, sort); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycles asc -> desc -> unsorted; resets to page 1 (a new sort order changes
  // what belongs on "page 1"), but keeps the current page size.
  const handleSort = (sortBy, order) => {
    const nextSort = { sortBy, order };
    setSort(nextSort);
    fetchRooms(1, pagination.pageSize, nextSort);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormData(INITIAL_FORM);
    setOpen(true);
  };

  const openEdit = (room) => {
    setEditTarget(room);
    setFormData({
      name:              room.name ?? '',
      capacity:          room.capacity ?? 40,
      type:              room.type ?? 'LECTURE_ROOM',
      buildingName:      room.building?.name ?? 'Main Building',
      allowedCategories: (room.allowedCategories ?? []).join(', '),
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
      const response = await axios.post('/api/rooms', formData, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Room created successfully.', 'success');
        closeModal();
        fetchRooms(1, pagination.pageSize);
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to create room.', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await axios.put(`/api/rooms/${editTarget.id}`, formData, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Room updated successfully.', 'success');
        closeModal();
        fetchRooms(pagination.page, pagination.pageSize);
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to update room.', 'error');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    editTarget ? handleUpdate() : handleCreate();
  };

  const askDelete = (id) => { setDeleteId(id); setDeleteOpen(true); };

  const confirmDelete = async () => {
    try {
      const response = await axios.delete(`/api/rooms/${deleteId}`, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Room deleted successfully.', 'success');
        setDeleteOpen(false);
        setDeleteId(null);
        const isLastRowOnPage = rooms.length === 1 && pagination.page > 1;
        fetchRooms(isLastRowOnPage ? pagination.page - 1 : pagination.page, pagination.pageSize);
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to delete room.', 'error');
      setDeleteOpen(false);
    }
  };

  return (
    <Box>
      <Toast toast={toast} onClose={hideToast} />

      {/* ── Header — matches Manage Schedules pattern exactly ─────────────── */}
      <Box
        sx={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          mb:             4,
          width:          '100%',
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: 'text.primary' }}>
            Manage Rooms
          </Typography>
          <Typography color="text.secondary">
            Create classrooms and laboratories for schedule assignment.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreFromTrashIcon />}
            onClick={() => navigate('/rooms/recently-deleted')}
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
            Add Room
          </Button>
        </Box>
      </Box>

      {/* ── Rooms Table ────────────────────────────────────────────────────── */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <SortableTableCell label="Room Name" sortKey="name" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                <SortableTableCell label="Building" sortKey="building" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                <SortableTableCell label="Type" sortKey="type" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                <SortableTableCell label="Capacity" sortKey="capacity" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                <TableCell>Allowed Categories</TableCell>
                <SortableTableCell label="Date Created" sortKey="createdAt" sortBy={sort.sortBy} order={sort.order} onSort={handleSort} />
                <TableCell>Schedules Using Room</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No rooms created yet.
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => (
                  <TableRow key={room.id} hover>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.building?.name || 'N/A'}</TableCell>
                    <TableCell>{room.type}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>{(room.allowedCategories ?? []).length > 0 ? room.allowedCategories.join(', ') : '-'}</TableCell>
                    <TableCell>{formatDate(room.createdAt)}</TableCell>
                    <TableCell>{room._count?.schedules || 0}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(room)} sx={{ color: '#2563eb' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => askDelete(room.id)} sx={{ color: '#ef4444' }}>
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
          onPageChange={(_, newPage) => fetchRooms(newPage + 1, pagination.pageSize)}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={(e) => fetchRooms(1, parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* ── Create / Edit Room Modal ───────────────────────────────────────── */}
      <Modal
        open={open}
        onClose={closeModal}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 4, width: 420 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            {editTarget ? 'Edit Room' : 'Create New Room'}
          </Typography>

          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField label="Room Name"     name="name"         value={formData.name}         onChange={handleChange} required fullWidth />
            <TextField label="Building Name" name="buildingName" value={formData.buildingName} onChange={handleChange} required fullWidth />
            <TextField label="Capacity"      name="capacity"     type="number"                 value={formData.capacity} onChange={handleChange} required fullWidth />
            <TextField
              select label="Room Type" name="type"
              value={formData.type} onChange={handleChange}
              required fullWidth
            >
              {ROOM_TYPES.map((rt) => (
                <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Allowed Categories" name="allowedCategories"
              value={formData.allowedCategories} onChange={handleChange}
              placeholder="e.g. IT"
              helperText="Comma-separated. Leave blank to allow any class. Must match a subject's required room category exactly."
              fullWidth
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editTarget ? 'Update Room' : 'Save Room'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, width: 380, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            Delete Room?
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            This only works if the room is not used in any schedule.
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={() => setDeleteOpen(false)}
              sx={{ borderRadius: '10px', textTransform: 'none', px: 3 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={confirmDelete}
              sx={{ bgcolor: '#ef4444', borderRadius: '10px', textTransform: 'none', px: 3,
                '&:hover': { bgcolor: '#dc2626' } }}>
              Delete Room
            </Button>
          </Stack>
        </Paper>
      </Modal>
    </Box>
  );
}