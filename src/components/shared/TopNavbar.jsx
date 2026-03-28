import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Bell, Sun, Moon, Zap, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { resolveAssetUrl } from '../../utils/assetUrl';
import codevedaSymbol from '../../assets/codeveda_symbol2.png';
import codevedaText from '../../assets/codeveda_text3.jpg';

export default function TopNavbar({ pageTitle, setMobileOpen }) {
  const { currentUser } = useAuth();
  const { notifications, unreadCount, markAllRead, openNotification } = useNotification();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const isDark = theme === 'dark';
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const notificationPanelRef = useRef(null);
  const langMenuRef = useRef(null);
  const recentNotifications = notifications.slice(0, 8);
  const companyName = (settings?.companyName || 'TASKFLOW').trim();
  const companyParts = companyName.split(/\s+/).filter(Boolean);
  const companyPrimary = companyParts[0] || 'TASKFLOW';
  const companySecondary = companyParts.slice(1).join(' ');

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
        className="md:hidden p-2 rounded-xl transition-colors"
        style={{ color: 'var(--primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <Menu size={20} />
      </button>

      {/* Page title / Logo */}
      <div className="flex-1 overflow-hidden flex items-center pr-4">
        <div className="transition-all duration-300 hover:opacity-80 flex items-center gap-0 pl-1 md:pl-2">
          {/* Symbol */}
          <div className="relative flex items-center">
            {settings?.logoDataUrl ? (
              <img
                src={resolveAssetUrl(settings.logoDataUrl)}
                alt="Brand Logo"
                className="h-[32px] w-[32px] md:h-[40px] md:w-[40px] object-cover rounded-xl border border-white/10 shadow-sm"
              />
            ) : (
              <img 
                src={codevedaSymbol} 
                alt="Brand Symbol" 
                className={`h-[32px] md:h-[40px] w-auto object-contain transition-all duration-300 z-10 ${
                  isDark 
                    ? 'invert mix-blend-screen drop-shadow-[0_0_8px_rgba(0,180,255,0.3)]' 
                    : 'mix-blend-multiply drop-shadow-sm'
                }`}
                style={{ filter: isDark ? 'invert(1) hue-rotate(180deg)' : 'none' }}
              />
            )}
          </div>
          
          {/* Dynamic Company Name */}
          <div className="flex flex-col ml-3 md:ml-4">
            <span className={`text-[15px] md:text-[18px] font-black tracking-[0.15em] uppercase leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}
              style={{ fontFamily: "'Outfit', sans-serif" }}>
              {companyPrimary}
            </span>
            {companySecondary && (
              <span className={`text-[8px] md:text-[10px] font-bold tracking-[0.3em] uppercase mt-1 ${isDark ? 'text-indigo-400/80' : 'text-indigo-600/80'}`}>
                {companySecondary}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side container */}
      <div className="flex flex-col items-end justify-center py-1 shrink-0">
        
        {/* Actions Row */}
        <div className="flex items-center gap-1.5 md:gap-2">
          
          {/* Glowing status bar */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: isDark ? 'rgba(0,255,136,0.06)' : 'rgba(5, 150, 105, 0.05)', border: `1px solid ${isDark ? 'rgba(0,255,136,0.15)' : 'rgba(5, 150, 105, 0.1)'}` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: isDark ? '0 0 8px #00ff88' : 'none' }} />
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">{t('online')}</span>
          </div>

          {/* Action Icons Wrapper */}
          <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-all duration-300 border border-white/10 dark:border-white/5 shadow-sm"
          style={{ 
            color: 'var(--primary)',
            background: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
        </motion.button>

        {/* Language switcher */}
        <div className="relative" ref={langMenuRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 border"
            style={{ 
              color: 'var(--primary)',
              background: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Globe size={18} strokeWidth={2.5} />
            <span className="text-[10px] font-bold font-mono tracking-widest">{currentLanguage.toUpperCase()}</span>
          </motion.button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute right-0 top-[calc(100%+8px)] z-30 w-40 p-1.5 rounded-2xl border overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: 'var(--shadow-lg)',
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      currentLanguage === lang.id ? 'bg-indigo-500/10 text-indigo-600 dark:bg-cyan-500/10 dark:text-cyan-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] font-bold font-mono tracking-wider">{lang.label.toUpperCase()}</span>
                    {currentLanguage === lang.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={notificationPanelRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotificationPanel((prev) => !prev)}
            className="relative p-2.5 rounded-xl transition-all duration-300 border"
            style={{
              color: unreadCount > 0 ? 'var(--primary-glow)' : 'var(--primary)',
              background: 'var(--bg-input)',
              borderColor: unreadCount > 0 ? 'var(--border-glow)' : 'var(--border-subtle)',
              boxShadow: unreadCount > 0 ? '0 0 15px var(--accent-glow)' : 'var(--shadow-sm)',
            }}
            title={t('task_alerts')}
          >
            <Bell size={18} strokeWidth={2.5} className={unreadCount > 0 && isDark ? 'animate-pulse' : ''} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-[#030012]"
                style={{ background: 'var(--status-overdue)', boxShadow: '0 0 10px rgba(255, 69, 58, 0.4)' }}
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
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="border-b px-4 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono font-bold tracking-[0.24em] text-indigo-600 dark:text-cyan-400 uppercase">{t('notif_log')}</p>
                      <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{t('task_alerts')}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={unreadCount === 0}
                      className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-[10px] font-mono font-bold tracking-[0.18em] text-indigo-600 dark:text-cyan-400 transition hover:bg-indigo-500/10 dark:hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
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
                        className="w-full rounded-2xl border px-4 py-3 text-left transition-all duration-300 hover:shadow-md group/notif"
                        style={{
                          borderColor: notification.isRead ? 'var(--border-subtle)' : 'var(--primary-glow)',
                          background: notification.isRead ? 'transparent' : 'var(--bg-secondary)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-bold transition-colors ${notification.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                              {notification.taskTitle || notification.message}
                            </p>
                            <p className={`mt-1 text-xs leading-relaxed transition-colors ${notification.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {notification.description || notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-indigo-600 dark:bg-cyan-300 shadow-[0_0_12px_var(--primary-glow)] animate-pulse" />
                          )}
                        </div>
                        <p className="mt-3 text-[10px] font-mono font-bold tracking-[0.16em] text-indigo-600/60 dark:text-cyan-400/60 uppercase italic">
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
          whileHover={{ scale: 1.1, y: -1 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white cursor-pointer transition-all duration-300 border"
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {currentUser?.avatar || (currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : '??')}
        </motion.div>
          </div>
        </div>

        {/* Date Row (Moved from left side) */}
        <p className="text-[9px] hidden sm:block font-mono tracking-widest mt-[5px] opacity-80" style={{ color: 'var(--text-dim)' }}>
          {t('sys_date')} :: {new Date().toLocaleDateString(currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'gu' ? 'gu-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
        </p>
      </div>
    </header>
  );
}
