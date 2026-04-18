import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlantFlow Twin',
  description: 'Lightweight deterministic process twin for manufacturing line simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
