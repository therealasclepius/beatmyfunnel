'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleWithdraw = async () => {
    setWithdrawing(true)
    setError('')
    const supabase = createClient()

    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId)

    if (deleteError) {
      setError('Failed to withdraw application. Please try again.')
      setWithdrawing(false)
      return
    }

    setSuccess(true)
    setShowConfirm(false)
    setTimeout(() => {
      router.refresh()
    }, 1500)
  }

  if (success) {
    return (
      <div style={styles.successBox}>
        <span style={styles.successText}>Application withdrawn successfully.</span>
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div style={styles.confirmBox}>
        <p style={styles.confirmText}>
          Are you sure you want to withdraw your application? This cannot be undone.
        </p>
        {error && <p style={styles.errorText}>{error}</p>}
        <div style={styles.confirmActions}>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            style={styles.dangerButton}
          >
            {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={withdrawing}
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setShowConfirm(true)} style={styles.withdrawButton}>
      Withdraw Application
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  withdrawButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#ff4757',
    background: 'transparent',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  confirmBox: {
    padding: '16px 20px',
    background: 'rgba(255, 71, 87, 0.05)',
    border: '1px solid rgba(255, 71, 87, 0.2)',
    borderRadius: '8px',
    width: '100%',
  },
  confirmText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginBottom: '12px',
  },
  confirmActions: {
    display: 'flex',
    gap: '12px',
  },
  dangerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '38px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    background: '#ff4757',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  cancelButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '38px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  successBox: {
    padding: '16px 20px',
    background: 'rgba(46, 213, 115, 0.05)',
    border: '1px solid rgba(46, 213, 115, 0.2)',
    borderRadius: '8px',
    width: '100%',
  },
  successText: {
    fontSize: '14px',
    color: '#2ed573',
    fontWeight: 500,
  },
  errorText: {
    fontSize: '13px',
    color: '#ff4757',
    marginBottom: '8px',
  },
}
