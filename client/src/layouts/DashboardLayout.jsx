// client/src/layouts/DashboardLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import SystemClock from '../components/SystemClock';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Button, Tooltip, useMediaQuery, Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu             as MenuIcon,
  Dashboard        as DashIcon,
  CalendarMonth    as SchedIcon,
  GridView         as PlotterIcon,
  RestoreFromTrash as TrashIcon,
  People           as TeacherIcon,
  MeetingRoom      as RoomIcon,
  History          as AuditIcon,
  Settings         as SettingsIcon,
  Logout           as LogoutIcon,
  Payments         as PaymentsIcon,
  School           as FacultyIcon,
  MenuBook         as ClassListIcon,
  Assessment       as ReportsIcon,
  AutoAwesome      as TimmyIcon,
  EventAvailable   as AvailIcon,
  PendingActions   as RequestsIcon,
  WorkspacePremium as CredentialIcon,
  ChevronLeft,   // ✅ FIX 3: added for collapse toggle button
  ChevronRight,  // ✅ FIX 3: added for collapse toggle button
  KeyboardArrowRight as CaretIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

// ─── Design tokens — matches Login.jsx, adapted per theme mode ──────────────
const LIGHT_TOKENS = {
  primary:      '#1B2B5E',
  accent:       '#C49A3C',
  accentLight:  'rgba(196, 154, 60, 0.12)',
  background:   '#F2F0EB',
  card:         '#ffffff',
  secondary:    '#E8E4D9',
  muted:        '#6B6E7E',
  border:       'rgba(27, 43, 94, 0.10)',
  sidebarBg:    '#1B2B5E',
  sidebarText:  'rgba(255,255,255,0.75)',
  sidebarHover: 'rgba(255,255,255,0.06)',
  sidebarActive:'rgba(255,255,255,0.08)',
};

const DARK_TOKENS = {
  primary:      '#E8E4D9',
  accent:       '#C49A3C',
  accentLight:  'rgba(196, 154, 60, 0.18)',
  background:   '#0f172a',
  card:         '#1e293b',
  secondary:    '#111a2e',
  muted:        '#94a3b8',
  border:       'rgba(232, 228, 217, 0.10)',
  sidebarBg:    '#0b1330',
  sidebarText:  'rgba(255,255,255,0.75)',
  sidebarHover: 'rgba(255,255,255,0.06)',
  sidebarActive:'rgba(255,255,255,0.08)',
};

const getTokens = (mode) => (mode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS);

const DRAWER_WIDTH    = 260;
const COLLAPSED_WIDTH = 76;

// ─── Nav items ────────────────────────────────────────────────────────────────
// roles: plain strings from AuthContext.login() — user.role is a STRING like
// "ADMINISTRATOR", NOT a Prisma object. Never use user?.role?.name here.
const NAV_ITEMS = [
  {
    text:  'Dashboard View',
    path:  '/dashboard',
    icon:  <DashIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'INSTRUCTOR', 'STUDENT'],
  },
  {
    text:  'My Schedules',
    path:  '/my-schedules',
    icon:  <SchedIcon fontSize="small" />,
    roles: ['INSTRUCTOR'],
  },
  {
    text:  'My Availability',
    path:  '/instructor/availability',
    icon:  <AvailIcon fontSize="small" />,
    roles: ['INSTRUCTOR'],
  },
  {
    text:  'Ask Timmy',
    path:  '/instructor/timmy',
    icon:  <TimmyIcon fontSize="small" />,
    roles: ['INSTRUCTOR'],
  },
  {
    text:  'Manage Schedules',
    path:  '/schedules',
    icon:  <SchedIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
  // ✅ FIX 1: removed duplicate "Manage Schedules" entry that was here
  {
    text:  'Schedule Plotter',
    path:  '/schedules/plotter',
    icon:  <PlotterIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
  {
    text:  'Schedule Requests',
    path:  '/schedule-requests',
    icon:  <RequestsIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Manage Teachers',
    path:  '/teachers',
    icon:  <TeacherIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
  {
    text:  'Manage Rooms',
    path:  '/rooms',
    icon:  <RoomIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
  {
    text:  'Subject Requirements',
    path:  '/subjects',
    icon:  <CredentialIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
  {
    text:  'Audit Logs',
    path:  '/audit-logs',
    icon:  <AuditIcon fontSize="small" />,
    roles: ['ADMINISTRATOR'],
  },
  {
    text:  'Payment Dashboard',
    path:  '/cashier/dashboard',
    icon:  <PaymentsIcon fontSize="small" />,
    roles: ['CASHIER'],
  },
  {
    text:  'Manage Faculty',
    path:  '/cashier/faculty',
    icon:  <FacultyIcon fontSize="small" />,
    roles: ['CASHIER'],
  },
  {
    text:  'Manage Class List',
    path:  '/cashier/classes',
    icon:  <ClassListIcon fontSize="small" />,
    roles: ['CASHIER'],
  },
  {
    text:  'View Schedule',
    path:  '/cashier/schedule',
    icon:  <SchedIcon fontSize="small" />,
    roles: ['CASHIER'],
  },
  {
    text:  'Reports',
    path:  '/cashier/reports',
    icon:  <ReportsIcon fontSize="small" />,
    roles: ['CASHIER'],
  },
  {
    text:  'Ask Timmy',
    path:  '/cashier/timmy',
    icon:  <TimmyIcon fontSize="small" />,
    roles: ['CASHIER'],
  },
  {
    text:  'Registrar Dashboard',
    path:  '/registrar/dashboard',
    icon:  <DashIcon fontSize="small" />,
    roles: ['REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Manage Faculty',
    path:  '/registrar/faculty',
    icon:  <FacultyIcon fontSize="small" />,
    roles: ['REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Manage Class List',
    path:  '/registrar/classes',
    icon:  <ClassListIcon fontSize="small" />,
    roles: ['REGISTRAR_SCHEDULER'],
  },
  {
    text:  'View Schedule',
    path:  '/registrar/schedule',
    icon:  <SchedIcon fontSize="small" />,
    roles: ['REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Ask Timmy',
    path:  '/registrar/timmy',
    icon:  <TimmyIcon fontSize="small" />,
    roles: ['REGISTRAR_SCHEDULER'],
  },
  {
    text:  'Recently Deleted',
    icon:  <TrashIcon fontSize="small" />,
    roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER', 'CASHIER', 'INSTRUCTOR'],
    children: [
      {
        text:  'Deleted Schedules',
        path:  '/schedules/recently-deleted',
        roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'],
      },
      {
        text:  'Deleted Teachers',
        path:  '/teachers/recently-deleted',
        roles: ['ADMINISTRATOR'],
      },
      {
        text:  'Deleted Rooms',
        path:  '/rooms/recently-deleted',
        roles: ['ADMINISTRATOR'],
      },
      {
        text:  'Deleted Payments',
        path:  '/cashier/recently-deleted',
        roles: ['CASHIER'],
      },
      {
        text:  'Deleted Requests',
        path:  '/instructor/recently-deleted',
        roles: ['INSTRUCTOR'],
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user, logout }            = useAuth();
  const navigate                    = useNavigate();
  const location                    = useLocation();
  const theme                       = useTheme();
  const C                           = getTokens(theme.palette.mode);
  const isDesktop                   = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [collapsed, setCollapsed]           = useState(false);
  const [deletedMenuOpen, setDeletedMenuOpen] = useState(false);

  const handleDrawerToggle = () => {
    if (isDesktop) {
      setCollapsed((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  // user.role is a plain string ("ADMINISTRATOR" etc.) — not a Prisma object
  const userRole = user?.role ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ─── Sidebar content ────────────────────────────────────────────────────────
  const drawerContent = (
    <Box
      sx={{
        height:        '100%',
        display:       'flex',
        flexDirection: 'column',
        bgcolor:       C.sidebarBg,
        fontFamily:    "'Plus Jakarta Sans', sans-serif",
        position:      'relative',
        overflowX:     'hidden',
        '&::-webkit-scrollbar':       { width: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.12)', borderRadius: 2 },
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px:  collapsed ? 0 : 3,
          pt:  3.5,
          pb:  3,
        }}
      >
        <Box
          sx={{
            display:        'flex',
            alignItems:     'center',
            gap:            1.5,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
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
              <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3 }}>
                OptimaSched
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── User block ────────────────────────────────────────────────────── */}
      <Box sx={{ px: collapsed ? 1 : 3, pb: 3 }}>
        <Tooltip title={collapsed ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}` : ''} placement="right">
          <Box
            sx={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap:            1.5,
              p:              1.5,
              borderRadius:   '12px',
              bgcolor:        'rgba(255,255,255,0.06)',
              border:         '1px solid rgba(255,255,255,0.08)',
              cursor:         'pointer',
              transition:     'background-color 0.15s ease',
              '&:hover':      { bgcolor: 'rgba(255,255,255,0.09)' },
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
                <Typography noWrap sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.3 }}>
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

            {!collapsed && (
              <CaretIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, ml: 'auto', flexShrink: 0 }} />
            )}
          </Box>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: collapsed ? 1 : 3, mb: 2 }} />

      {/* ── Nav section label ─────────────────────────────────────────────── */}
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

          // ── Group item (e.g. "Recently Deleted") — expands into per-entity links ──
          if (item.children) {
            const visibleChildren = item.children.filter(
              (child) => !child.roles || child.roles.includes(userRole)
            );
            if (visibleChildren.length === 0) return null;

            const isGroupActive = visibleChildren.some((child) => location.pathname === child.path);

            const handleGroupClick = () => {
              if (collapsed) {
                navigate(visibleChildren[0].path);
                setMobileOpen(false);
              } else {
                setDeletedMenuOpen((o) => !o);
              }
            };

            const groupButton = (
              <ListItemButton
                onClick={handleGroupClick}
                selected={isGroupActive}
                sx={{
                  borderRadius:           '12px',
                  py:                     1,
                  px:                     1.5,
                  justifyContent:         collapsed ? 'center' : 'flex-start',
                  position:               'relative',
                  transition:             'all 0.15s ease',
                  bgcolor:                isGroupActive ? C.accentLight : 'transparent',
                  '&:hover':              { bgcolor: isGroupActive ? C.accentLight : C.sidebarHover },
                  '&.Mui-selected':       { bgcolor: C.accentLight },
                  '&.Mui-selected:hover': { bgcolor: C.accentLight },
                }}
              >
                {isGroupActive && !collapsed && (
                  <Box
                    sx={{
                      position:     'absolute',
                      left:         0,
                      top:          '50%',
                      transform:    'translateY(-50%)',
                      width:        3,
                      height:       20,
                      borderRadius: '0 3px 3px 0',
                      bgcolor:      C.accent,
                    }}
                  />
                )}

                <ListItemIcon
                  sx={{
                    minWidth:   collapsed ? 0 : 36,
                    color:      isGroupActive ? C.accent : C.sidebarText,
                    transition: 'color 0.15s',
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                {!collapsed && (
                  <>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize:   '0.825rem',
                          fontWeight: isGroupActive ? 600 : 400,
                          color:      isGroupActive ? '#fff' : C.sidebarText,
                          transition: 'all 0.15s',
                        },
                      }}
                    />
                    {deletedMenuOpen ? (
                      <ExpandLess sx={{ fontSize: 18, color: C.sidebarText }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 18, color: C.sidebarText }} />
                    )}
                  </>
                )}
              </ListItemButton>
            );

            return (
              <ListItem key="recently-deleted-group" disablePadding sx={{ display: 'block' }}>
                {collapsed ? (
                  <Tooltip title={item.text} placement="right" arrow>
                    <Box sx={{ width: '100%' }}>{groupButton}</Box>
                  </Tooltip>
                ) : groupButton}

                {!collapsed && (
                  <Collapse in={deletedMenuOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {visibleChildren.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <ListItemButton
                            key={child.path}
                            onClick={() => { navigate(child.path); setMobileOpen(false); }}
                            selected={isChildActive}
                            sx={{
                              borderRadius:           '10px',
                              py:                     0.75,
                              pl:                     4.5,
                              pr:                     1.5,
                              bgcolor:                isChildActive ? C.accentLight : 'transparent',
                              '&:hover':              { bgcolor: isChildActive ? C.accentLight : C.sidebarHover },
                              '&.Mui-selected':       { bgcolor: C.accentLight },
                              '&.Mui-selected:hover': { bgcolor: C.accentLight },
                            }}
                          >
                            <ListItemText
                              primary={child.text}
                              sx={{
                                '& .MuiListItemText-primary': {
                                  fontSize:   '0.775rem',
                                  fontWeight: isChildActive ? 600 : 400,
                                  color:      isChildActive ? '#fff' : C.sidebarText,
                                },
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </ListItem>
            );
          }

          const isActive = location.pathname === item.path;

          const button = (
            <ListItemButton
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              selected={isActive}
              sx={{
                borderRadius:           '12px',
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
              {/* Gold left-edge active bar — hidden when collapsed */}
              {isActive && !collapsed && (
                <Box
                  sx={{
                    position:     'absolute',
                    left:         0,
                    top:          '50%',
                    transform:    'translateY(-50%)',
                    width:        3,
                    height:       20,
                    borderRadius: '0 3px 3px 0',
                    bgcolor:      C.accent,
                  }}
                />
              )}

              <ListItemIcon
                sx={{
                  minWidth:   collapsed ? 0 : 36,
                  color:      isActive ? C.accent : C.sidebarText,
                  transition: 'color 0.15s',
                }}
              >
                {item.icon}
              </ListItemIcon>

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
            // ✅ Use item.path as key — unique per route, never duplicates
            <ListItem key={item.path} disablePadding>
              {collapsed ? (
                <Tooltip title={item.text} placement="right" arrow>
                  <Box sx={{ width: '100%' }}>{button}</Box>
                </Tooltip>
              ) : button}
            </ListItem>
          );
        })}
      </List>

      {/* ── Settings + Logout ─────────────────────────────────────────────── */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 2 }} />
        <Tooltip title={collapsed ? 'Settings' : ''} placement="right">
          <Button
            fullWidth
            onClick={() => { navigate('/settings'); setMobileOpen(false); }}
            startIcon={collapsed ? null : <SettingsIcon />}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              minWidth:       0,
              px:             1.5,
              py:             1,
              mb:             0.5,
              borderRadius:   '8px',
              color:          location.pathname === '/settings' ? '#fff' : C.sidebarText,
              bgcolor:        location.pathname === '/settings' ? C.accentLight : 'transparent',
              fontSize:       '0.825rem',
              fontWeight:     500,
              textTransform:  'none',
              '&:hover':      { bgcolor: C.sidebarHover },
            }}
          >
            {collapsed ? <SettingsIcon fontSize="small" /> : 'Settings'}
          </Button>
        </Tooltip>
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
              '&:hover':      { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
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
            sx={{ mr: 1, display: { xs: 'inline-flex', md: 'none' } }}
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
            <Typography sx={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              A.Y. 2026–2027
            </Typography>
          </Box>

          {/* System time */}
          <SystemClock C={C} />

          {/* Notifications */}
          <Box sx={{ color: C.primary }}>
            <NotificationBell />
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
      <Box
        component="nav"
        sx={{
          width:      { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing:   theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
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
              boxSizing:  'border-box',
              width:      drawerWidth,
              border:     'none',
              boxShadow:  '4px 0 24px rgba(27,43,94,0.12)',
              overflowX:  'hidden',
              transition: theme.transitions.create('width', {
                easing:   theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Floating collapse toggle — rendered outside the drawer's clipped
            scroll area so it isn't cut off by overflowX: hidden */}
        {isDesktop && (
          <Box
            component="button"
            onClick={() => setCollapsed((c) => !c)}
            sx={{
              position:       'fixed',
              left:           drawerWidth - 14,
              top:            '50%',
              transform:      'translateY(-50%)',
              width:          28,
              height:         28,
              borderRadius:   '50%',
              bgcolor:        C.accent,
              border:         `2px solid ${C.sidebarBg}`,
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              zIndex:         theme.zIndex.drawer + 1,
              boxShadow:      '0 2px 8px rgba(0,0,0,0.3)',
              transition:     theme.transitions.create('left', {
                easing:   theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              '&:hover': { bgcolor: '#b8892e' },
            }}
          >
            {collapsed
              ? <ChevronRight sx={{ fontSize: 15, color: '#fff' }} />
              : <ChevronLeft  sx={{ fontSize: 15, color: '#fff' }} />}
          </Box>
        )}
      </Box>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow:   1,
          p:          3,
          boxSizing:  'border-box',
          width:      { md: `calc(100% - ${drawerWidth}px)` },
          minHeight:  '100vh',
          bgcolor:    C.card,
          transition: theme.transitions.create('width', {
            easing:   theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}