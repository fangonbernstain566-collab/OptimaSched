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
import RecentlyDeletedTeachers from './pages/RecentlyDeletedTeachers';
import RecentlyDeletedRooms from './pages/RecentlyDeletedRooms';
import AuditLogs from './pages/AuditLogs';
import InstructorSchedules from './pages/InstructorSchedules';
import Settings from './pages/Settings';
import CashierDashboard from './pages/cashier/CashierDashboard';
import CashierFaculty from './pages/cashier/CashierFaculty';
import CashierClasses from './pages/cashier/CashierClasses';
import CashierSchedule from './pages/cashier/CashierSchedule';
import CashierReports from './pages/cashier/CashierReports';
import RegistrarDashboard from './pages/registrar/RegistrarDashboard';
import RegistrarFaculty from './pages/registrar/RegistrarFaculty';
import RegistrarClassList from './pages/registrar/RegistrarClassList';
import RegistrarSchedule from './pages/registrar/RegistrarSchedule';
import RegistrarTimmy from './pages/registrar/RegistrarTimmy';
import CashierTimmy from './pages/cashier/CashierTimmy';
import InstructorTimmy from './pages/instructor/InstructorTimmy';
import InstructorAvailability from './pages/instructor/InstructorAvailability';
import ScheduleRequests from './pages/ScheduleRequests';
import CashierRecentlyDeleted from './pages/cashier/CashierRecentlyDeleted';
import InstructorRecentlyDeleted from './pages/instructor/InstructorRecentlyDeleted';

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
          path="teachers/recently-deleted"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <RecentlyDeletedTeachers />
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
          path="rooms/recently-deleted"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <RecentlyDeletedRooms />
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

        <Route path="settings" element={<Settings />} />

        <Route
          path="instructor/timmy"
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <InstructorTimmy />
            </ProtectedRoute>
          }
        />
        <Route
          path="instructor/availability"
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <InstructorAvailability />
            </ProtectedRoute>
          }
        />
        <Route
          path="instructor/recently-deleted"
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <InstructorRecentlyDeleted />
            </ProtectedRoute>
          }
        />

        <Route
          path="schedule-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'REGISTRAR_SCHEDULER']}>
              <ScheduleRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="cashier/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/faculty"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierFaculty />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/classes"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/schedule"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/reports"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/timmy"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierTimmy />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/recently-deleted"
          element={
            <ProtectedRoute allowedRoles={['CASHIER']}>
              <CashierRecentlyDeleted />
            </ProtectedRoute>
          }
        />

        <Route
          path="registrar/dashboard"
          element={
            <ProtectedRoute allowedRoles={['REGISTRAR_SCHEDULER']}>
              <RegistrarDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="registrar/faculty"
          element={
            <ProtectedRoute allowedRoles={['REGISTRAR_SCHEDULER']}>
              <RegistrarFaculty />
            </ProtectedRoute>
          }
        />
        <Route
          path="registrar/classes"
          element={
            <ProtectedRoute allowedRoles={['REGISTRAR_SCHEDULER']}>
              <RegistrarClassList />
            </ProtectedRoute>
          }
        />
        <Route
          path="registrar/schedule"
          element={
            <ProtectedRoute allowedRoles={['REGISTRAR_SCHEDULER']}>
              <RegistrarSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="registrar/timmy"
          element={
            <ProtectedRoute allowedRoles={['REGISTRAR_SCHEDULER']}>
              <RegistrarTimmy />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catchall */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}