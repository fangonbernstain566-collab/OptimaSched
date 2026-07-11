// client/src/components/SubjectCredentialManager.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Button, Modal, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

export default function SubjectCredentialManager() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [credentialsInput, setCredentialsInput] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/subjects', getAuthHeaders());
      if (response.data.success) setSubjects(response.data.data);
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to load subjects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openEdit = (subject) => {
    setEditTarget(subject);
    setCredentialsInput((subject.requiredCredentials ?? []).join(', '));
  };

  const closeModal = () => {
    setEditTarget(null);
    setCredentialsInput('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const requiredCredentials = credentialsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const response = await axios.patch(
        `/api/subjects/${editTarget.id}/credentials`,
        { requiredCredentials },
        getAuthHeaders()
      );
      if (response.data.success) {
        showToast(response.data.message ?? 'Required credentials updated.', 'success');
        closeModal();
        fetchSubjects();
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to update required credentials.', 'error');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: 'background.default', mt: -4 }}>
      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ maxWidth: '1100px', mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>
            Subject Credential Requirements
          </Typography>
          <Typography color="text.secondary">
            Set which credentials an instructor must hold to be assigned to a subject
            (e.g. "Masters in IT" for IT subjects). Leave blank for no restriction.
          </Typography>
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
                    <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Required Credentials</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                        No subjects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{s.code}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>
                          {(s.requiredCredentials ?? []).length > 0
                            ? s.requiredCredentials.join(', ')
                            : <Typography component="span" color="text.disabled">None</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit required credentials">
                            <IconButton size="small" onClick={() => openEdit(s)} sx={{ color: '#2563eb' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Modal open={!!editTarget} onClose={closeModal}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ p: 4, bgcolor: 'background.paper', width: '100%', maxWidth: '440px', borderRadius: '20px' }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>
              {editTarget?.code} — {editTarget?.name}
            </Typography>
            <form onSubmit={handleSave}>
              <Stack spacing={2.5}>
                <TextField
                  label="Required Credentials" fullWidth
                  value={credentialsInput}
                  onChange={(e) => setCredentialsInput(e.target.value)}
                  placeholder="e.g. Masters in IT"
                  helperText="Comma-separated. Must match a teacher's credential tags exactly."
                />
                <Button fullWidth variant="contained" type="submit"
                  sx={{ py: 1.5, bgcolor: '#2563eb', borderRadius: '10px', textTransform: 'none' }}>
                  Save
                </Button>
              </Stack>
            </form>
          </Box>
        </Modal>
      </Box>
    </Box>
  );
}
