import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardView from './pages/view/DashboardView';
import ProtectedRoute from './components/ProtectedRoute';
import Schedules from './pages/Schedules';
import TeacherManager from './components/TeacherManager';
import RoomManager from './components/RoomManager';
import ManageSchedules from './pages/ManageSchedules';
import SchedulePlotter from './pages/SchedulePlotter';
import RecentlyDeletedSchedules from './pages/RecentlyDeletedSchedules';
import AuditLogs from './pages/AuditLogs';
import InstructorSchedules from './pages/InstructorSchedules';

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Layout Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardView />} />

        {/* ✅ FIX 1: Relative path (no leading /)
            ✅ FIX 2: Protected with roles
            ✅ FIX 3: Declared BEFORE plain "schedules" route */}
        <Route
          path="schedules/plotter"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'REGISTRAR_SCHEDULER']}>
              <SchedulePlotter />
            </ProtectedRoute>
          }
        />

        <Route
          path="schedules"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'REGISTRAR_SCHEDULER']}>
              <Schedules />
            </ProtectedRoute>
          }
        />

        <Route
          path="schedules/recently-deleted"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'REGISTRAR_SCHEDULER']}>
              <RecentlyDeletedSchedules />
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

        <Route
          path="audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="my-schedules"
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <InstructorSchedules />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catchall */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}