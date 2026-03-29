import nodemailer from 'nodemailer'
import { env } from '../env.js'

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
})

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${env.publicUrl}/verify?token=${token}`

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Verify your Slide Wiz account',
    html: `
      <h2>Welcome to Slide Wiz</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>— CUNY AI Lab</p>
    `,
  })
}
