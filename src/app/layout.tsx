import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lead Finder',
  description: 'Find city-wise local business leads and export them to Excel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}