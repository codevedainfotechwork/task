import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/shared/Sidebar';
import TopNavbar from '../components/shared/TopNavbar';
import ParticleField from '../components/3d/ParticleField';
import { useLanguage } from '../contexts/LanguageContext';

export default function DashboardLayout() {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const PAGE_TITLES = {
    '/employee':        t('title_my_tasks'),
    '/manager':         t('title_manager_hub'),
    '/manager/create':  t('nav_create_task'),
    '/manager/team':    t('nav_team'),
    '/admin':           t('title_control_center'),
    '/admin/tasks':     t('nav_all_tasks'),
    '/admin/users':     t('nav_all_users'),
    '/admin/departments': t('nav_departments'),
    '/admin/analytics': t('nav_analytics'),
  };

  const pageTitle = PAGE_TITLES[location.pathname] || t('nav_dashboard');


  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-primary)' }}>
      {/* 3D Particle Background */}
      <ParticleField />

      {/* Ambient orbs */}
      <div className="fixed top-0 left-0 w-[600px] h-[400px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, var(--accent-glow), transparent 70%)' }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[400px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 70% 80%, rgba(191,0,255,0.05) 0%, transparent 70%)' }} />

      {/* Content */}
      <div className="relative z-10 flex w-full h-full">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <TopNavbar pageTitle={pageTitle} setMobileOpen={setMobileOpen} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="w-full max-w-[100vw]"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
