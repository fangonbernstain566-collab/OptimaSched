import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Button
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashIcon, CalendarMonth as SchedIcon,
  Logout as LogoutIcon, SupervisorAccount as AdminIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';


const drawerWidth = 260;

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const navigationItems = [
    { text: 'Dashboard View', path: '/dashboard', icon: <DashIcon />, roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER', 'INSTRUCTOR', 'STUDENT'] },
    { text: 'Manage Schedules', path: '/schedules', icon: <SchedIcon />, roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'] },
    // ADDED: Navigation configuration for the new Teacher/Faculty view
    { text: 'Manage Teachers', path: '/teachers', icon: <AdminIcon />, roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'] },
    { text: 'Manage Rooms', path: '/rooms', icon: <AdminIcon />, roles: ['ADMINISTRATOR'] },
    { text: 'Manage Schedules (Advanced)', path: '/manage-schedules', icon: <SchedIcon />, roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'] },
    { text: 'Schedule Plotter', path: '/schedules/plotter', icon: <SchedIcon />, roles: ['ADMINISTRATOR', 'REGISTRAR_SCHEDULER'] }, 
  
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" fontWeight="bold" noWrap>
          OptimaSched UI
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Identity Summary Card Container */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
        <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 'bold' }}>
          {user?.firstName?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="subtitle2" fontWeight="bold" noWrap>{user?.firstName} {user?.lastName}</Typography>
          <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'lowercase' }} noWrap>{user?.role}</Typography>
        </Box>
      </Box>
      <Divider />

      <List sx={{ flexGrow: 1, px: 1 }}>
        {navigationItems.map((item) => {
          if (item.roles && !item.roles.includes(user?.role)) return null;
          const isSelected = location.pathname === item.path;
          
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                selected={isSelected}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'white' } }
                }}
              >
                <ListItemIcon sx={{ color: isSelected ? 'white' : 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isSelected ? 'bold' : 'medium' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={() => { logout(); navigate('/login'); }}
        >
          Disconnect Session
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` }, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}><MenuIcon /></IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight="600">
            PCLU Academic Control Workspace
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawers Responsive Setup */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>{drawerContent}</Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>{drawerContent}</Drawer>
      </Box>

      {/* Main Layout Context Injection Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Toolbar />
        <Outlet /> {/* Child views render here */}
      </Box>
    </Box>
  );
}