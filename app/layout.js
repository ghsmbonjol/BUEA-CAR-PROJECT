import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://buea-car-project.vercel.app'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Buea Regional Car Project',
    template: '%s | Buea Regional Car Project'
  },
  description: 'Contribution, vow and accountability management system for the Deeper Life Bible Church Buea Region Regional Car Project.',
  applicationName: 'Buea Regional Car Project',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }
    ]
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Deeper Life Bible Church — Buea Region',
    title: 'Buea Regional Car Project',
    description: 'Contribution, vow and accountability management for the Buea Region Regional Car Project.',
    images: [
      {
        url: '/social-share.png',
        width: 1200,
        height: 630,
        alt: 'Deeper Life Bible Church Buea Region — Regional Car Project'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buea Regional Car Project',
    description: 'Contribution, vow and accountability management for the Buea Region Regional Car Project.',
    images: ['/social-share.png']
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
