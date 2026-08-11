import './globals.css'

export const metadata = {
  title: 'Buea Regional Car Project',
  description: 'Contribution and vow management system for the Buea Region'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
