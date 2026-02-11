import './globals.css'

import type { ReactNode } from 'react'

import { Providers } from './providers'

export const metadata = {
  title: 'RayZ - Laser Tag Game Management',
  description: 'Manage your laser tag games with RayZ',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
