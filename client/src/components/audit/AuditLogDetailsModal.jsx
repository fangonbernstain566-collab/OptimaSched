import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Item = ({ label, value }) => (
  <>
    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mb: 1.5, wordBreak: 'break-word' }}>
      {value || '-'}
    </Typography>
  </>
);

export default function AuditLogDetailsModal({ open, onClose, log }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800 }}>
        Audit Log Details
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!log ? (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Item label="Log ID" value={log.id} />
                <Item label="Date & Time" value={new Date(log.createdAt).toLocaleString()} />
                <Item label="User ID" value={log.userId} />
                <Item label="User Name" value={log.userName} />
                <Item label="User Role" value={log.userRole} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Item label="Module" value={log.module} />
                <Item label="Action" value={log.action} />
                <Item label="Target Record ID" value={log.targetRecordId} />
                <Item label="Target Record Name" value={log.targetRecordName} />
                <Item label="IP Address" value={log.ipAddress} />
                <Item label="Browser / Device" value={log.userAgent} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Item label="Description" value={log.description} />

            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
              Metadata
            </Typography>
            <Typography
              component="pre"
              sx={{
                mt: 0.5,
                p: 1.5,
                borderRadius: '8px',
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.8rem',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(log.metadata ?? {}, null, 2)}
            </Typography>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
