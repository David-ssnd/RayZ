import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RayZ - Frontend',
  description: 'RayZ weapon and target system frontend',
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
