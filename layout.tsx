
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ocean CRM',
  description: 'AI + Voice Notes CRM Mock UI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
