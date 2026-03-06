import React from "react"
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });
const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Mic Drop - Open Mic Signup',
  description: 'Sign up for standup comedy open mics. No apps. No drama. Just slots.',
  generator: 'v0.app',
  openGraph: {
    title: 'Mic Drop',
    description: 'Sign up for standup comedy open mics. No apps. No drama. Just slots.',
    images: [{ url: '/icon.svg' }],
  },
  twitter: {
    card: 'summary',
    title: 'Mic Drop',
    description: 'Sign up for standup comedy open mics. No apps. No drama. Just slots.',
    images: ['/icon.svg'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1625',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased min-h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
