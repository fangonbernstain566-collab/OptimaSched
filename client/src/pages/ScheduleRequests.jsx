import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Button, Select, MenuItem, FormControl, InputLabel, Modal, Stack,
  TextField, Divider,
} from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon } from '@mui/icons-material';
import api from '../services/api';
import { listAllRequests, approveRequest, rejectRequest } from '../services/scheduleRequestApi';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const STATUS_COLOR = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

const formatTime = (time) => {
  if (!time) return time;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

function ApproveModal({ request, rooms, onClose, onApproved }) {
  const [roomId, setRoomId] = useState(request.roomId ?? '');
  const [saving, setSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleApprove = async () => {
    if (!roomId) {
      showToast('Please select a room.', 'error');
      return;
    }
    setSaving(true);
    try {
      await approveRequest(request.id, roomId);
      onApproved();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to approve request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 420, bgcolor: 'background.paper', borderRadius: '20px', p: 4 }}>
        <Toast toast={toast} onClose={hideToast} />
        <Typography variant="h6" fontWeight="800" sx={{ mb: 0.5 }}>Approve Request</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {request.subjectOffering?.subject?.name} — {request.dayOfWeek} {formatTime(request.startTime)}–{formatTime(request.endTime)}
        </Typography>
        <FormControl fullWidth required>
          <InputLabel>Room</InputLabel>
          <Select label="Room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={onClose} sx={{ borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
          <Button fullWidth variant="contained" disabled={saving} onClick={handleApprove} sx={{ bgcolor: '#16a34a', borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#15803d' } }}>
            {saving ? 'Approving…' : 'Approve & Schedule'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

function RejectModal({ request, onClose, onRejected }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReject = async () => {
    setSaving(true);
    try {
      await rejectRequest(request.id, notes);
      onRejected();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 420, bgcolor: 'background.paper', borderRadius: '20px', p: 4 }}>
        <Typography variant="h6" fontWeight="800" sx={{ mb: 0.5 }}>Reject Request</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {request.subjectOffering?.subject?.name} — {request.dayOfWeek} {formatTime(request.startTime)}–{formatTime(request.endTime)}
        </Typography>
        <TextField
          label="Reason (optional)" fullWidth multiline rows={3}
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Let the instructor know why…"
        />
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={onClose} sx={{ borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
          <Button fullWidth variant="contained" disabled={saving} onClick={handleReject} sx={{ bgcolor: '#dc2626', borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#b91c1c' } }}>
            {saving ? 'Rejecting…' : 'Reject'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default function ScheduleRequests() {
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      listAllRequests(statusFilter === 'ALL' ? undefined : statusFilter),
      api.get('/rooms?schedulable=true'),
    ])
      .then(([reqs, resRooms]) => {
        setRequests(reqs);
        setRooms(resRooms.data?.data ?? []);
      })
      .catch(() => showToast('Failed to load schedule requests.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      <Toast toast={toast} onClose={hideToast} />
      <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: 'text.primary' }}>Schedule Requests</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review instructor-submitted schedule requests. Approving assigns a room and places a real class.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
            <MenuItem value="ALL">All</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['Instructor', 'Subject', 'Section', 'Day / Time', 'Preferred Room', 'Students', 'Status', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.teacher?.user ? `${r.teacher.user.firstName} ${r.teacher.user.lastName}` : '—'}</TableCell>
                      <TableCell>{r.subjectOffering?.subject?.name ?? '—'}</TableCell>
                      <TableCell>{r.section?.name ?? '—'}</TableCell>
                      <TableCell>{r.dayOfWeek} {formatTime(r.startTime)}–{formatTime(r.endTime)}</TableCell>
                      <TableCell>{r.room?.name ?? <Typography variant="caption" color="text.secondary">No preference</Typography>}</TableCell>
                      <TableCell>{r.studentCount}</TableCell>
                      <TableCell>
                        <Chip label={r.status} size="small" color={STATUS_COLOR[r.status]} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {r.status === 'PENDING' && (
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" startIcon={<ApproveIcon />} onClick={() => setApproveTarget(r)} sx={{ textTransform: 'none', color: '#16a34a', fontWeight: 700 }}>
                              Approve
                            </Button>
                            <Button size="small" startIcon={<RejectIcon />} onClick={() => setRejectTarget(r)} sx={{ textTransform: 'none', color: '#dc2626', fontWeight: 700 }}>
                              Reject
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          rooms={rooms}
          onClose={() => setApproveTarget(null)}
          onApproved={() => { setApproveTarget(null); showToast('Request approved and scheduled!', 'success'); fetchData(); }}
        />
      )}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => { setRejectTarget(null); showToast('Request rejected.', 'success'); fetchData(); }}
        />
      )}
    </Box>
  );
}
