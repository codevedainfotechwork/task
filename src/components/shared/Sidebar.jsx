import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ClipboardList, Users, BarChart3, Building2,
  LogOut, ChevronLeft, ChevronRight, PlusCircle, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import { useLanguage } from '../../contexts/LanguageContext';

const NAV_BASE = {
  employee: [
    { to: '/employee', icon: LayoutDashboard, key: 'nav_dashboard', end: true },
  ],
  manager: [
    { to: '/manager', icon: LayoutDashboard, key: 'nav_dashboard', end: true },
    { to: '/manager/create', icon: PlusCircle, key: 'nav_create_task' },
    { to: '/manager/team',   icon: Users,     key: 'nav_team' },
  ],
  admin: [
    { to: '/admin',           icon: LayoutDashboard, key: 'title_overview',   end: true },
    { to: '/admin/tasks',     icon: ClipboardList,   key: 'nav_all_tasks' },
    { to: '/admin/users',     icon: Users,           key: 'nav_all_users' },
    { to: '/admin/departments', icon: Building2,     key: 'nav_departments' },
    { to: '/admin/analytics', icon: BarChart3,        key: 'nav_analytics' },
  ],
};

const ROLE_CONFIG = {
  employee: { label: 'EMPLOYEE', color: 'text-cyan-400',   glow: 'rgba(0,212,255,0.2)',   bg: 'rgba(0,212,255,0.08)' },
  manager:  { label: 'MANAGER',  color: 'text-purple-400', glow: 'rgba(191,0,255,0.2)',  bg: 'rgba(191,0,255,0.08)' },
  admin:    { label: 'ADMIN',    color: 'text-emerald-400', glow: 'rgba(0,255,136,0.2)',  bg: 'rgba(0,255,136,0.08)' },
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const links = (NAV_BASE[currentUser?.role] || []).map(link => ({
    ...link,
    label: t(link.key)
  }));
  
  const roleCfg = ROLE_CONFIG[currentUser?.role] || ROLE_CONFIG.employee;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className={`flex-shrink-0 h-screen fixed md:sticky top-0 left-0 z-50 overflow-hidden transition-transform duration-300 md:transition-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(24px)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.1), inset -1px 0 0 var(--border-subtle)',
        }}
      >
      {/* Scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none scan-overlay" style={{ zIndex: 0 }} />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, var(--accent-glow), rgba(191,0,255,0.15))',
            border: '1px solid var(--border-glow)',
            boxShadow: '0 0 20px var(--border-glow)',
          }}
        >
          <Zap size={16} className="text-cyan-300" />
          <div className="absolute inset-0 rounded-xl animate-glow-pulse" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.1), transparent)' }} />
        </motion.div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="font-bold text-slate-100 text-base tracking-wide whitespace-nowrap neon-text-blue">
                TaskFlow
              </span>
              <div className="text-[9px] font-mono tracking-widest mt-0.5 whitespace-nowrap" style={{ color: 'rgba(0,212,255,0.5)' }}>
                {t('label_cyber_edition')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto flex-shrink-0 p-1 rounded-lg transition-all duration-200"
          style={{ color: 'rgba(0,212,255,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,212,255,0.5)'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="relative z-10 px-4 py-3">
          <div className="px-3 py-2 rounded-lg" style={{ background: roleCfg.bg, border: `1px solid ${roleCfg.glow}` }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: roleCfg.glow.replace('0.2', '1') }} />
              <span className={`text-[10px] font-mono font-bold tracking-widest ${roleCfg.color}`}>{t(`badge_${currentUser?.role}`)}</span>
            </div>
            {currentUser?.role === 'manager' && (
              <p className="mt-2 text-[10px] font-mono tracking-[0.16em] text-purple-200/80">
                {(currentUser?.department?.length ? currentUser.department : [t('unassigned_caps')]).join(' / ').toUpperCase()} {t('label_dept_manager_caps')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={`flex-shrink-0 ${isActive ? 'text-cyan-400' : ''}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="whitespace-nowrap text-xs"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="relative z-10 px-3 py-4 border-t space-y-2" style={{ borderColor: 'rgba(0,212,255,0.06)' }}>
        {!collapsed && (
          <div className="px-3 py-2.5 rounded-xl mb-2"
            style={{ background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))', boxShadow: '0 0 12px var(--accent-glow)' }}
              >
                {currentUser?.avatar}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.name}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(0,212,255,0.6)', fontFamily: 'monospace' }}>{currentUser?.email}</p>
                {currentUser?.role === 'manager' && (
                  <p className="mt-1 text-[10px] truncate text-purple-300/80" style={{ fontFamily: 'monospace' }}>
                    {(currentUser?.department?.length ? currentUser.department : [t('unassigned_caps')]).join(', ')} {t('label_dept_manager')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-red-400 hover:text-red-300 ${collapsed ? 'justify-center px-0' : ''}`}
          style={{ '--hover-bg': 'rgba(255,68,68,0.08)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-xs uppercase">{t('nav_logout')}</span>}
        </button>
      </div>
    </motion.aside>
    </>
  );
}
