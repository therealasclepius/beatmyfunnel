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
  in_review: { bg: 'rgba(255, 200, 55, 0.15)', text: '#ffc837' },
  judging: { bg: 'rgba(255, 159, 67, 0.15)', text: '#ff9f43' },
  completed: { bg: 'rgba(46, 213, 115, 0.15)', text: '#2ed573' },
  cancelled: { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' },
  // Application statuses
  pending: { bg: 'rgba(110, 114, 121, 0.15)', text: '#6e7279' },
  shortlisted: { bg: 'rgba(255, 200, 55, 0.15)', text: '#ffc837' },
  finalist: { bg: 'rgba(138, 143, 255, 0.15)', text: '#8a8fff' },
  rejected: { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' },
  // Submission statuses
  submitted: { bg: 'rgba(138, 143, 255, 0.15)', text: '#8a8fff' },
  under_review: { bg: 'rgba(255, 200, 55, 0.15)', text: '#ffc837' },
  winner: { bg: 'rgba(46, 213, 115, 0.15)', text: '#2ed573' },
  runner_up: { bg: 'rgba(46, 213, 115, 0.15)', text: '#2ed573' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors.pending
  const label = status.replace(/_/g, ' ')

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '9999px',
        background: colors.bg,
        color: colors.text,
        textTransform: 'capitalize',
        letterSpacing: '0.01em',
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  )
}
