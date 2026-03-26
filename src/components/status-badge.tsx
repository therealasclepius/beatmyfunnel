'use client'

import React from 'react'

type BadgeVariant = 'challenge' | 'application' | 'submission'

interface StatusBadgeProps {
  status: string
  variant?: BadgeVariant
}

const statusColors: Record<string, { bg: string; text: string }> = {
  // Challenge statuses
  draft: { bg: 'rgba(110, 114, 121, 0.15)', text: '#6e7279' },
  open: { bg: 'rgba(138, 143, 255, 0.15)', text: '#8a8fff' },
  accepting_submissions: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
  testing: { bg: 'rgba(255, 200, 55, 0.15)', text: '#ffc837' },
  verifying: { bg: 'rgba(255, 159, 67, 0.15)', text: '#ff9f43' },
  completed: { bg: 'rgba(46, 213, 115, 0.15)', text: '#2ed573' },
  refunded: { bg: 'rgba(110, 114, 121, 0.15)', text: '#6e7279' },
  cancelled: { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' },
  // Application statuses
  pending: { bg: 'rgba(110, 114, 121, 0.15)', text: '#6e7279' },
  shortlisted: { bg: 'rgba(255, 200, 55, 0.15)', text: '#ffc837' },
  finalist: { bg: 'rgba(138, 143, 255, 0.15)', text: '#8a8fff' },
  rejected: { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' },
  // Submission statuses
  submitted: { bg: 'rgba(138, 143, 255, 0.15)', text: '#8a8fff' },
  selected_for_testing: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
  tested: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  winner: { bg: 'rgba(46, 213, 115, 0.15)', text: '#2ed573' },
  runner_up: { bg: 'rgba(110, 114, 121, 0.15)', text: '#6e7279' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors.pending
  const label = status.replace(/_/g, ' ')

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 500,
        borderRadius: '9999px',
        background: colors.bg,
        color: colors.text,
        textTransform: 'capitalize',
        letterSpacing: '0.01em',
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}
