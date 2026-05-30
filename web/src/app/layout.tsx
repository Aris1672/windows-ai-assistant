import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Windows AI Assistant',
  description: 'A contextual intelligence layer for Windows.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
