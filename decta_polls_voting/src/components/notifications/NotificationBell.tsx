"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, Calendar, Vote, UserCheck, Trash2, Loader2 } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  electionTitle: string | null;
  isRead: boolean;
}

interface NotificationBellProps {
  electionId?: string;
}

export default function NotificationBell({ electionId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('supabaseToken') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = electionId
        ? `/api/notifications?electionId=${electionId}`
        : '/api/notifications';

      const response = await fetch(url, { headers });

      if (response.status === 401 || response.status === 403) {
        // Don't clear interval on auth error, keep retrying
        console.warn("Auth error fetching notifications, will retry");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    // Initial fetch - add small delay to ensure auth is ready
    const initialTimer = setTimeout(() => {
      fetchNotifications();
    }, 100);

    // Poll every 10 seconds (reduced from 30 to catch updates faster)
    intervalRef.current = setInterval(fetchNotifications, 10000);
    
    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single as read
  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('supabaseToken') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationId: id }),
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (notifications.every(n => n.isRead)) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('supabaseToken') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers,
        body: JSON.stringify({ markAll: true }),
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'election_start':
        return <Calendar className="h-4 w-4 text-emerald-400" />;
      case 'election_end':
        return <Calendar className="h-4 w-4 text-rose-400" />;
      case 'candidate_registered':
        return <UserCheck className="h-4 w-4 text-indigo-400" />;
      case 'results_published':
        return <Vote className="h-4 w-4 text-amber-400" />;
      case 'vote_cast':
        return <Check className="h-4 w-4 text-teal-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-10 w-10 items-center justify-center rounded-full text-white bg-white/10 transition-all hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5 transition-transform group-hover:rotate-[15deg]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-[var(--tenant-primary,black)] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3.5 w-80 sm:w-96 origin-top-right rounded-3xl border border-white/10 bg-slate-900/95 p-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.6)] backdrop-blur-2xl transition-all z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-sm font-black uppercase tracking-wider text-slate-300">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1 space-y-2.5 no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Bell className="mx-auto h-8 w-8 text-slate-500 opacity-50 mb-2" />
                <p className="text-xs font-semibold">You're all caught up!</p>
                <p className="text-[10px] text-slate-500 mt-0.5">No notifications here yet.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id, notif.isRead)}
                  className={`flex gap-3 rounded-2xl p-3 border transition duration-200 cursor-pointer ${
                    notif.isRead
                      ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      : 'bg-white/[0.06] border-white/[0.12] hover:bg-white/[0.08]'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-black leading-tight ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400 animate-pulse mt-1" />
                      )}
                    </div>
                    {notif.electionTitle && (
                      <p className="text-[9px] font-bold text-indigo-300 uppercase mt-0.5 truncate">
                        {notif.electionTitle}
                      </p>
                    )}
                    <p className={`text-[11px] mt-1 leading-normal ${notif.isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium mt-1.5">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
