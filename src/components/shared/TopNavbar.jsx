import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Bell, Sun, Moon, Zap, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function TopNavbar({ pageTitle, setMobileOpen }) {
  const { currentUser } = useAuth();
  const { notifications, unreadCount, markAllRead, openNotification } = useNotification();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const notificationPanelRef = useRef(null);
  const langMenuRef = useRef(null);
  const recentNotifications = notifications.slice(0, 8);

  useEffect(() => {
    if (!showNotificationPanel) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        setShowNotificationPanel(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationPanel, showLangMenu]);

  return (
    <header
      className="h-[68px] flex-shrink-0 flex items-center px-4 md:px-6 gap-3 md:gap-4 sticky top-0 z-20 pr-2"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(24px)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden p-2 rounded-xl text-cyan-400 hover:bg-cyan-900/40 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Zap size={14} className="text-cyan-400 flex-shrink-0" style={{ filter: 'drop-shadow(0 0 6px #00d4ff)' }} />
          <h1 className="text-sm md:text-base font-bold tracking-wide neon-text-blue truncate">{pageTitle}</h1>
        </div>
        <p className="text-[10px] hidden sm:block font-mono mt-0.5" style={{ color: 'rgba(0,212,255,0.35)' }}>
          {t('sys_date')} :: {new Date().toLocaleDateString(currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'gu' ? 'gu-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
        </p>
      </div>

      {/* Glowing status bar */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 8px #00ff88' }} />
        <span className="text-[10px] font-mono text-emerald-400 tracking-wider uppercase">{t('online')}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all duration-200"
          style={{ color: 'rgba(0,212,255,0.5)', border: '1px solid rgba(0,212,255,0.08)' }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>

        {/* Language switcher */}
        <div className="relative" ref={langMenuRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            style={{ color: 'rgba(0,212,255,0.5)', border: '1px solid rgba(0,212,255,0.08)' }}
          >
            <Globe size={16} />
            <span className="text-[10px] font-bold font-mono">{currentLanguage.toUpperCase()}</span>
          </motion.button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute right-0 top-[calc(100%+8px)] z-30 w-32 p-1.5 rounded-2xl border"
                style={{
                  background: 'rgba(3,7,18,0.95)',
                  borderColor: 'rgba(0,212,255,0.16)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              >
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'Hindi (हिन्दी)' },
                  { id: 'gu', label: 'Gujarati (ગુજરાતી)' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setCurrentLanguage(lang.id);
                      setShowLangMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                      currentLanguage === lang.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] font-medium">{lang.label}</span>
                    {currentLanguage === lang.id && <div className="w-1 h-1 rounded-full bg-cyan-400" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={notificationPanelRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotificationPanel((prev) => !prev)}
            className="relative p-2 rounded-xl transition-all duration-200"
            style={{
              color: unreadCount > 0 ? '#00d4ff' : 'rgba(0,212,255,0.4)',
              border: `1px solid ${unreadCount > 0 ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.08)'}`,
              boxShadow: unreadCount > 0 ? '0 0 15px rgba(0,212,255,0.15)' : 'none',
            }}
            title={t('task_alerts')}
          >
            <Bell size={16} className={unreadCount > 0 ? 'animate-pulse-neon' : ''} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center"
                style={{ background: '#00d4ff', boxShadow: '0 0 10px #00d4ff' }}
              >
                {unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotificationPanel && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 top-[calc(100%+12px)] z-30 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border"
                style={{
                  background: 'linear-gradient(160deg, rgba(3,7,18,0.96), rgba(8,15,30,0.94))',
                  borderColor: 'rgba(0,212,255,0.16)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 30px rgba(0,212,255,0.08)',
                }}
              >
                <div className="border-b border-cyan-400/10 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono tracking-[0.24em] text-cyan-300/70 uppercase">{t('notif_log')}</p>
                      <h3 className="mt-1 text-sm font-semibold text-white uppercase">{t('task_alerts')}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={unreadCount === 0}
                      className="rounded-xl border border-cyan-400/15 px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] text-cyan-200 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t('mark_read')}
                    </button>
                  </div>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto px-3 py-3">
                  {recentNotifications.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                      {t('msg_no_notifs')}
                    </div>
                  ) : (
                    recentNotifications.map((notification, index) => (
                      <button
                        key={notification.id ?? `${notification.createdAt ?? 'notif'}-${index}`}
                        type="button"
                        onClick={() => {
                          openNotification(notification);
                          setShowNotificationPanel(false);
                        }}
                        className="w-full rounded-2xl border px-4 py-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                        style={{
                          borderColor: notification.isRead ? 'rgba(255,255,255,0.08)' : 'rgba(0,212,255,0.18)',
                          background: notification.isRead ? 'rgba(255,255,255,0.03)' : 'rgba(0,212,255,0.05)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {notification.taskTitle || notification.message}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">
                              {notification.description || notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                          )}
                        </div>
                        <p className="mt-3 text-[10px] font-mono tracking-[0.16em] text-cyan-300/55">
                          {notification.createdAt
                            ? new Date(notification.createdAt).toLocaleString(currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'gu' ? 'gu-IN' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : t('just_now')}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile avatar */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.7), rgba(191,0,255,0.7))',
            border: '1px solid rgba(0,212,255,0.4)',
            boxShadow: '0 0 15px rgba(0,212,255,0.2)',
          }}
        >
          {currentUser?.avatar}
        </motion.div>
      </div>
    </header>
  );
}
