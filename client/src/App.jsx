import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardView from './pages/view/DashboardView'; // Imported and verified path
import ProtectedRoute from './components/ProtectedRoute';
import Schedules from './pages/Schedules';
import TeacherManager from './components/TeacherManager'; // Imported and verified path
import RoomManager from './components/RoomManager'; // Imported and verified path
import ManageSchedules from './pages/ManageSchedules'; // Imported and verified path


export default function App() {
  return (
    <Routes>
      {/* Public Route Gateway */}
      <Route path="/login" element={<Login />} />

      {/* Secured Shell Workspace Environment Layout Group */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Swapped placeholder out for your modern analytics panel */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardView />} />
        
        {/* Strictly Guarded Scheduling Manager View Context */}
        <Route 
          path="schedules" 
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'REGISTRAR_SCHEDULER']}>
              <Schedules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="teachers" 
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <TeacherManager />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="rooms" 
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <RoomManager />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="manage-schedules" 
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'REGISTRAR_SCHEDULER']}>
              <ManageSchedules />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Fallback Catchall Route Redirect Strategy */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}