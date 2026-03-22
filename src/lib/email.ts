import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'notifications@beatmyfunnel.com'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beatmyfunnel.com'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    await resend.emails.send({
      from: `Beat My Funnel <${FROM}>`,
      to,
      subject,
      html: wrapInTemplate(subject, html),
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

function wrapInTemplate(subject: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#08090a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
        <div style="margin-bottom:32px;">
          <a href="${BASE_URL}" style="color:#f7f8f8;font-size:16px;font-weight:600;text-decoration:none;">Beat My Funnel</a>
        </div>
        <div style="background:#141416;border:1px solid #23252a;border-radius:12px;padding:32px;">
          ${content}
        </div>
        <div style="margin-top:24px;text-align:center;">
          <p style="color:#484b52;font-size:12px;margin:0;">You're receiving this because you have an account on Beat My Funnel.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// --- Email templates ---

export function emailNewApplication(brandName: string, challengeTitle: string, operatorName: string, challengeId: string) {
  return {
    subject: `New application for "${challengeTitle}"`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">New Application</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${brandName}, someone wants to compete.</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Applicant</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0;">${operatorName}</p>
      </div>
      <a href="${BASE_URL}/challenges/${challengeId}/manage" style="display:inline-block;background:#f7f8f8;color:#08090a;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">Review Application</a>
    `,
  }
}

export function emailSelectedAsFinalist(operatorName: string, challengeTitle: string, challengeId: string) {
  return {
    subject: `You've been selected as a finalist!`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">You're a Finalist!</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${operatorName}, great news.</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#8a8fff;font-size:14px;margin:0;">You've been selected as a finalist. Time to submit your work.</p>
      </div>
      <a href="${BASE_URL}/challenges/${challengeId}/submit" style="display:inline-block;background:#f7f8f8;color:#08090a;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">Submit Your Work</a>
    `,
  }
}

export function emailNewSubmission(brandName: string, challengeTitle: string, operatorName: string, challengeId: string) {
  return {
    subject: `New submission for "${challengeTitle}"`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">New Submission</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${brandName}, a finalist submitted their work.</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Submitted by</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0;">${operatorName}</p>
      </div>
      <a href="${BASE_URL}/challenges/${challengeId}/manage" style="display:inline-block;background:#f7f8f8;color:#08090a;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">Review Submission</a>
    `,
  }
}

export function emailSelectedForTesting(operatorName: string, challengeTitle: string) {
  return {
    subject: `Your submission was selected for live testing!`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">Selected for Testing</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${operatorName}, your work is going live.</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#8a8fff;font-size:14px;margin:0;">Your submission has been selected to run as a live test against the baseline. We'll notify you when results are verified.</p>
      </div>
    `,
  }
}

export function emailWinner(operatorName: string, challengeTitle: string, prizeAmount: number) {
  const prize = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(prizeAmount / 100)
  return {
    subject: `You won! ${prize} prize releasing`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">🏆 You Won!</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Congratulations ${operatorName}!</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Prize</p>
        <p style="color:#27a644;font-size:24px;font-weight:700;margin:0;">${prize}</p>
      </div>
      <p style="color:#6e7279;font-size:14px;margin:0;">Your prize is being released. We'll be in touch about payout details.</p>
    `,
  }
}

export function emailChallengeComplete(brandName: string, challengeTitle: string, winnerName: string, challengeId: string) {
  return {
    subject: `Challenge complete — winner confirmed`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">Challenge Complete</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${brandName}, your challenge has a winner.</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Winner</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0;">${winnerName}</p>
      </div>
      <a href="${BASE_URL}/challenges/${challengeId}/manage" style="display:inline-block;background:#f7f8f8;color:#08090a;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">View Results</a>
    `,
  }
}

export function emailRefund(brandName: string, challengeTitle: string) {
  return {
    subject: `Challenge refunded — no winner`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">Challenge Refunded</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${brandName},</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#6e7279;font-size:14px;margin:0;">No submission beat your baseline. Your full prize has been refunded.</p>
      </div>
    `,
  }
}

export function emailChallengeResult(operatorName: string, challengeTitle: string, won: boolean) {
  return {
    subject: won ? `You won the challenge!` : `Challenge results are in`,
    html: `
      <h2 style="color:#f7f8f8;font-size:20px;margin:0 0 8px;">${won ? '🏆 You Won!' : 'Challenge Results'}</h2>
      <p style="color:#6e7279;font-size:14px;margin:0 0 24px;">Hey ${operatorName},</p>
      <div style="background:#08090a;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="color:#b4b8c0;font-size:14px;margin:0 0 4px;">Challenge</p>
        <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 12px;">${challengeTitle}</p>
        <p style="color:#6e7279;font-size:14px;margin:0;">${won
          ? 'Congratulations — your submission beat the baseline! Your prize is being released.'
          : 'This challenge has been decided. While your submission wasn\'t selected as the winner, it\'s now a verified entry in your portfolio. Thank you for competing.'
        }</p>
      </div>
    `,
  }
}
