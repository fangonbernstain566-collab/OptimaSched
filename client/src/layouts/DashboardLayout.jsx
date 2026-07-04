// client/src/layouts/DashboardLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Button, Tooltip, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu          as MenuIcon,
  Dashboard     as DashIcon,
  CalendarMonth as SchedIcon,
  GridView      as PlotterIcon,
  RestoreFromTrash as TrashIcon,
  People        as TeacherIcon,
  MeetingRoom   as RoomIcon,
  History       as AuditIcon,
  Logout        as LogoutIcon,
} from '@mui/icons-material';

// ─── Design tokens — matches Login.jsx ───────────────────────────────────────
const C = {
  primary:     '#1B2B5E',
  accent:      '#C49A3C',
  accentLight: 'rgba(196, 154, 60, 0.12)',
  background:  '#F2F0EB',
  card:        '#ffffff',
  secondary:   '#E8E4D9',
  muted:       '#6B6E7E',
  border:      'rgba(27, 43, 94, 0.10)',
  sidebarText: 'rgba(255,255,255,0.75)',
  sidebarHover:'rgba(255,255,255,0.08)',
};

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 76;

// ─── Nav config ───────────────────────────────────────────────────────────────
// roles: plain strings matching what AuthContext.login() saves (user.role as string,
// NOT a Prisma object). Comparison must be against user?.role, not user?.role?.name.
const NAV_ITEMS = [
  {
    text:  'Dashboard View',
    path:  '/dashboard',
    icon:  <DashIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER', 'INSTRUCTOR', 'STUDENT'],
  },
{
    text:  'Schedule Plotter',
    path:  '/schedules/plotter',
    icon:  <PlotterIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Manage Schedules',
    path:  '/schedules',
    icon:  <SchedIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'],
  },
 
  {
    text:  'Manage Teachers',
    path:  '/teachers',
    icon:  <TeacherIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Manage Rooms',
    path:  '/rooms',
    icon:  <RoomIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
   {
    text:  'Recently Deleted',
    path:  '/schedules/recently-deleted',
    icon:  <TrashIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Audit Logs',
    path:  '/audit-logs',
    icon:  <AuditIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user, logout }              = useAuth();
  const navigate                      = useNavigate();
  const location                      = useLocation();
  const theme                         = useTheme();
  const isDesktop                     = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [collapsed, setCollapsed]     = useState(false);

  const handleDrawerToggle = () => {
    if (isDesktop) {
      setCollapsed((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  // user.role is a plain string from AuthContext ("ADMINISTRATOR", etc.)
  // NOT a Prisma object — never use user?.role?.name here
  const userRole = user?.role ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ─── Sidebar ────────────────────────────────────────────────────────────────
  const drawerContent = (
    <Box
      sx={{
        height:        '100%',
        display:       'flex',
        flexDirection: 'column',
        bgcolor:       C.primary,
        fontFamily:    "'Plus Jakarta Sans', sans-serif",
        '&::-webkit-scrollbar':       { width: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.12)', borderRadius: 2 },
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <Box sx={{ px: collapsed ? 0 : 3, pt: 3.5, pb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {/* ✅ FIX: removed duplicate CalendarIcon import — SchedIcon is the same icon */}
          <Box
            sx={{
              width:          36,
              height:         36,
              borderRadius:   '8px',
              bgcolor:        C.accent,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
              boxShadow:      '0 2px 8px rgba(196,154,60,0.35)',
            }}
          >
            <SchedIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          {!collapsed && (
            <Box>
              <Typography
                sx={{
                  color:         'rgba(255,255,255,0.5)',
                  fontSize:      '0.6rem',
                  fontWeight:    700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  lineHeight:    1,
                }}
              >
                PCLU
              </Typography>
              <Typography
                sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3 }}
              >
                OptimaSched
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── User block ────────────────────────────────────────────────────── */}
      <Box sx={{ px: collapsed ? 1 : 3, pb: 3 }}>
        <Box
          sx={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap:            1.5,
            p:              1.5,
            borderRadius:   '10px',
            bgcolor:        'rgba(255,255,255,0.06)',
            border:         '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Avatar
            sx={{
              width:      36,
              height:     36,
              bgcolor:    C.accent,
              fontSize:   '0.8rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.3 }}
              >
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography
                noWrap
                sx={{
                  color:         C.accent,
                  fontSize:      '0.65rem',
                  fontWeight:    600,
                  letterSpacing: '0.06em',
                  textTransform: 'lowercase',
                }}
              >
                {userRole.replace(/_/g, ' ').toLowerCase()}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 3, mb: 2 }} />

      {/* ── Nav label ─────────────────────────────────────────────────────── */}
      {!collapsed && (
        <Typography
          sx={{
            px:            3,
            mb:            1,
            color:         'rgba(255,255,255,0.3)',
            fontSize:      '0.6rem',
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Navigation
        </Typography>
      )}

      {/* ── Nav items ─────────────────────────────────────────────────────── */}
      <List sx={{ flexGrow: 1, px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {NAV_ITEMS.map((item) => {
          if (item.roles && !item.roles.includes(userRole)) return null;

          const isActive = location.pathname === item.path;

          const button = (
            <ListItemButton
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              selected={isActive}
              sx={{
                borderRadius:           '8px',
                py:                     1,
                px:                     1.5,
                justifyContent:         collapsed ? 'center' : 'flex-start',
                position:               'relative',
                transition:             'all 0.15s ease',
                bgcolor:                isActive ? C.accentLight : 'transparent',
                '&:hover':              { bgcolor: isActive ? C.accentLight : C.sidebarHover },
                '&.Mui-selected':       { bgcolor: C.accentLight },
                '&.Mui-selected:hover': { bgcolor: C.accentLight },
              }}
            >
              {/* Gold left-edge active indicator */}
              {isActive && (
                <Box
                  sx={{
                    position:     'absolute',
                    left:         0,
                    top:          '20%',
                    bottom:       '20%',
                    width:        3,
                    borderRadius: '0 3px 3px 0',
                    bgcolor:      C.accent,
                  }}
                />
              )}

              {/* ✅ FIX: icon was defined in NAV_ITEMS but never rendered */}
              <ListItemIcon
                sx={{
                  minWidth:   collapsed ? 0 : 36,
                  color:      isActive ? C.accent : C.sidebarText,
                  transition: 'color 0.15s',
                }}
              >
                {item.icon}
              </ListItemIcon>

              {/* ✅ Uses sx selector — avoids MUI ignoring color in primaryTypographyProps */}
              {!collapsed && (
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize:   '0.825rem',
                      fontWeight: isActive ? 600 : 400,
                      color:      isActive ? '#fff' : C.sidebarText,
                      transition: 'all 0.15s',
                    },
                  }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding>
              {collapsed ? (
                <Tooltip title={item.text} placement="right">
                  <Box sx={{ width: '100%' }}>{button}</Box>
                </Tooltip>
              ) : button}
            </ListItem>
          );
        })}
      </List>

      {/* ── Logout ────────────────────────────────────────────────────────── */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 2 }} />
        <Tooltip title={collapsed ? 'Disconnect Session' : ''} placement="right">
          <Button
            fullWidth
            onClick={handleLogout}
            startIcon={collapsed ? null : <LogoutIcon />}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              minWidth:       0,
              px:             1.5,
              py:             1,
              borderRadius:   '8px',
              color:          'rgba(255,255,255,0.4)',
              fontSize:       '0.825rem',
              fontWeight:     500,
              textTransform:  'none',
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.12)',
                color:   '#f87171',
              },
            }}
          >
            {collapsed ? <LogoutIcon fontSize="small" /> : 'Disconnect Session'}
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    // ✅ FIX: was C.background (#F2F0EB beige) — pages need a white canvas
    <Box sx={{ display: 'flex', bgcolor: C.card, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── AppBar ────────────────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width:        { md: `calc(100% - ${drawerWidth}px)` },
          ml:           { md: `${drawerWidth}px` },
          bgcolor:      C.card,
          color:        C.primary,
          borderBottom: `1px solid ${C.border}`,
          boxShadow:    '0 1px 12px rgba(27,43,94,0.06)',
          transition:   theme.transitions.create(['width', 'margin'], {
            easing:   theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            noWrap
            sx={{ flexGrow: 1, fontWeight: 600, fontSize: '0.95rem', color: C.primary }}
          >
            PCLU Academic Control Workspace
          </Typography>

          {/* Academic year badge */}
          <Box
            sx={{
              display:      { xs: 'none', sm: 'flex' },
              alignItems:   'center',
              gap:          1,
              px:           1.5,
              py:           0.5,
              borderRadius: '20px',
              bgcolor:      C.secondary,
              border:       `1px solid ${C.border}`,
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: C.accent }} />
            <Typography
              sx={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              A.Y. 2026–2027
            </Typography>
          </Box>

          {/* User avatar */}
          <Avatar
            sx={{
              width:      32,
              height:     32,
              bgcolor:    C.accent,
              fontSize:   '0.72rem',
              fontWeight: 700,
              boxShadow:  '0 2px 8px rgba(196,154,60,0.3)',
            }}
          >
            {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar drawers ───────────────────────────────────────────────── */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {/* Mobile — temporary */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop — permanent */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width:     drawerWidth,
              border:    'none',
              boxShadow: '4px 0 24px rgba(27,43,94,0.12)',
              overflowX: 'hidden',
              transition: theme.transitions.create('width', {
                easing:   theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow:  1,
          p:         3,
          boxSizing: 'border-box',
          width:     { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          // ✅ FIX: was C.background (beige) — explicit white for all page content
          bgcolor:   C.card,
          transition: theme.transitions.create('width', {
            easing:   theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer — keeps content below the fixed AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
}