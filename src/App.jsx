import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { SoundProvider } from './contexts/SoundContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import AppHeartbeat from './components/shared/AppHeartbeat';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth & Public pages
import Landing from './pages/public/Landing';
import LoginSelection from './pages/auth/LoginSelection';
import AdminLogin from './pages/auth/AdminLogin';
import ManagerLogin from './pages/auth/ManagerLogin';
import EmployeeLogin from './pages/auth/EmployeeLogin';
import Signup from './pages/auth/Signup';

// Dashboards
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/public/NotFound';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in:      { opacity: 1,  x: 0 },
  out:     { opacity: 0,  x: -20 },
};

const pageTransition = { duration: 0.25, ease: 'easeInOut' };

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ width: '100%', height: '100%' }}
      >
        <Routes location={location}>
          {/* Public & Auth */}
          <Route path="/"               element={<Landing />} />
          <Route path="/login"          element={<LoginSelection />} />
          <Route path="/login/manager"  element={<ManagerLogin />} />
          <Route path="/login/employee" element={<EmployeeLogin />} />

          {/* Hidden Admin Login */}
          <Route path="/secure-admin-portal-xyz" element={<AdminLogin />} />
          <Route path="/signup"         element={<Signup />} />

          {/* Protected: Employee */}
          <Route element={<ProtectedRoute allowedRoles={['employee']}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/employee" element={<EmployeeDashboard />} />
          </Route>

          {/* Protected: Manager */}
          <Route element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/manager"        element={<ManagerDashboard />} />
            <Route path="/manager/create" element={<ManagerDashboard />} />
            <Route path="/manager/my-tasks" element={<ManagerDashboard />} />
            <Route path="/manager/team"   element={<ManagerDashboard />} />
          </Route>

          {/* Protected: Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/admin"            element={<AdminDashboard />} />
            <Route path="/admin/tasks"      element={<AdminDashboard />} />
            <Route path="/admin/users"      element={<AdminDashboard />} />
            <Route path="/admin/departments" element={<AdminDashboard />} />
            <Route path="/admin/analytics"  element={<AdminDashboard />} />
            <Route path="/admin/settings"  element={<AdminDashboard />} />
          </Route>

          {/* Default */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    const blockContextMenu = event => event.preventDefault();

    const blockInspectShortcuts = event => {
      const key = String(event.key || '').toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      if (
        key === 'f12' ||
        (ctrlOrMeta && shift && ['i', 'j', 'c'].includes(key)) ||
        (ctrlOrMeta && key === 'u')
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockInspectShortcuts);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockInspectShortcuts);
    };
  }, []);

  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <SoundProvider>
            <ToastProvider>
              <AuthProvider>
                <SettingsProvider>
                  <TaskProvider>
                    <NotificationProvider>
                      <AppHeartbeat />
                      <AnimatedRoutes />
                    </NotificationProvider>
                  </TaskProvider>
                </SettingsProvider>
              </AuthProvider>
            </ToastProvider>
          </SoundProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
