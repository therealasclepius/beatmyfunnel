'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import type { Notification } from '@/types/database'

export default function NotificationDropdown() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data as Notification[])
    }
  }, [user])

  // Initial fetch + Realtime subscription
  useEffect(() => {
    if (!user) return

    fetchNotifications()

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
    }

    setOpen(false)

    if (notification.link) {
      router.push(notification.link)
    }
  }

  const markAllRead = async () => {
    setLoading(true)
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
    setLoading(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'challenge_update':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L10 5.5L15 6.2L11.5 9.5L12.4 14.5L8 12.1L3.6 14.5L4.5 9.5L1 6.2L6 5.5L8 1Z" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
          </svg>
        )
      case 'application_update':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4L8 8.5L14 4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--text-secondary)" strokeWidth="1.5" fill="none" />
          </svg>
        )
      case 'submission_update':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8L7 11L12 5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5" fill="none" />
          </svg>
        )
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--text-tertiary)" strokeWidth="1.5" fill="none" />
            <path d="M8 5V9" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.75" fill="var(--text-tertiary)" />
          </svg>
        )
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div ref={dropdownRef} style={styles.wrapper}>
      <button
        onClick={() => setOpen(!open)}
        style={styles.bellButton}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2C7.24 2 5 4.24 5 7V10.5L3.5 13H16.5L15 10.5V7C15 4.24 12.76 2 10 2Z"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M8 13V14C8 15.1 8.9 16 10 16C11.1 16 12 15.1 12 14V13"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.headerTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={styles.markAllButton}
                disabled={loading}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>
                <span style={styles.emptyText}>No notifications yet</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    ...styles.item,
                    background: notification.read
                      ? 'transparent'
                      : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={styles.iconWrap}>
                    {getIcon(notification.type)}
                    {!notification.read && <span style={styles.unreadDot} />}
                  </div>
                  <div style={styles.itemContent}>
                    <span style={{
                      ...styles.itemTitle,
                      fontWeight: notification.read ? 400 : 500,
                    }}>
                      {notification.title}
                    </span>
                    <span style={styles.itemMessage}>{notification.message}</span>
                  </div>
                  <span style={styles.itemTime}>{formatTime(notification.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
  },
  bellButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'none',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    padding: 0,
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: '16px',
    textAlign: 'center',
    color: '#fff',
    background: '#ef4444',
    borderRadius: '8px',
  },
  dropdown: {
    position: 'fixed',
    top: '56px',
    left: '12px',
    right: '12px',
    maxWidth: '380px',
    marginLeft: 'auto',
    maxHeight: '480px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    zIndex: 200,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-primary)',
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  markAllButton: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },
  list: {
    overflowY: 'auto',
    maxHeight: '420px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-quaternary)',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderBottom: '1px solid var(--border-primary)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background 0.1s',
  },
  iconWrap: {
    position: 'relative',
    flexShrink: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
  },
  unreadDot: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    background: '#3b82f6',
    borderRadius: '50%',
    border: '2px solid var(--bg-card)',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemTitle: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
  },
  itemMessage: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemTime: {
    flexShrink: 0,
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    whiteSpace: 'nowrap',
  },
}
