'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { Profile, UserRole } from '@/types/database'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const ALL_ROLES: UserRole[] = ['brand', 'operator', 'admin']

interface UserWithEmail extends Profile {
  email: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      console.error('Failed to load users')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateRole = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId)
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      await loadData()
    } catch {
      console.error('Failed to update role')
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const brands = users.filter((u) => u.role === 'brand')
  const operators = users.filter((u) => u.role === 'operator')
  const admins = users.filter((u) => u.role === 'admin')

  return (
    <div>
      <h1 style={styles.pageTitle}>Users</h1>

      {/* Summary */}
      <div style={styles.statsRow}>
        <div style={styles.statChip}>
          <span style={styles.statChipValue}>{users.length}</span>
          <span style={styles.statChipLabel}>Total</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statChipValue}>{brands.length}</span>
          <span style={styles.statChipLabel}>Brands</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statChipValue}>{operators.length}</span>
          <span style={styles.statChipLabel}>Operators</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statChipValue}>{admins.length}</span>
          <span style={styles.statChipLabel}>Admins</span>
        </div>
      </div>

      {/* Users Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Joined</th>
              <th style={styles.th}>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {user.display_name}
                </td>
                <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                  {user.email}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.roleBadge,
                    background: user.role === 'admin'
                      ? 'rgba(138, 143, 255, 0.15)'
                      : user.role === 'brand'
                        ? 'rgba(255, 200, 55, 0.15)'
                        : 'rgba(46, 213, 115, 0.15)',
                    color: user.role === 'admin'
                      ? '#8a8fff'
                      : user.role === 'brand'
                        ? '#ffc837'
                        : '#2ed573',
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>
                  {user.company_name || '—'}
                </td>
                <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>
                  {formatDate(user.created_at)}
                </td>
                <td style={styles.td}>
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                    disabled={updatingId === user.id}
                    style={styles.selectSmall}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 16px' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '24px',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  statChip: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '10px',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statChipValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  statChipLabel: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  tableWrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-primary)',
  },
  tr: {
    borderBottom: '1px solid var(--border-primary)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '9999px',
    textTransform: 'capitalize',
  },
  selectSmall: {
    padding: '4px 8px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
}
