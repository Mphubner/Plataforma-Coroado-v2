import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './next.css';

export const metadata: Metadata = {
  title: 'Plataforma Coroado',
  description: 'Operacao integrada da Igreja Coroado',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
