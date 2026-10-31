import React from 'react';
import './globals.css';
import { StoreProvider } from '@/lib/context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
