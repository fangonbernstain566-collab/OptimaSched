import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItemButton,
  ListItemText, Divider, Button, CircularProgress,
} from '@mui/material';
import { Notifications as BellIcon, DoneAll as ReadAllIcon } from '@mui/icons-material';
import {
  getMyNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
} from '../services/notificationApi';

const POLL_MS = 30000;

const timeAgo = (value) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshCount]);

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    setLoading(true);
    getMyNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false));
  };

  const handleClose = () => setAnchorEl(null);

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // non-fatal
      }
    }
    handleClose();
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      // non-fatal
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: 'inherit' }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <BellIcon />
        </Badge>
      </IconButton>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480, borderRadius: '14px' } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="800">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" startIcon={<ReadAllIcon fontSize="small" />} onClick={handleMarkAllRead} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No notifications yet.
          </Typography>
        ) : (
          <List sx={{ py: 0, overflowY: 'auto', maxHeight: 400 }}>
            {notifications.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleItemClick(n)}
                sx={{
                  alignItems: 'flex-start',
                  bgcolor: n.isRead ? 'transparent' : 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {!n.isRead && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#2563eb', flexShrink: 0 }} />}
                      <Typography variant="body2" fontWeight={n.isRead ? 500 : 700}>{n.title}</Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                        {n.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                        {timeAgo(n.createdAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
