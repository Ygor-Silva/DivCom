import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Divcom - Gestão de Comissões',
  description: 'Sistema inteligente de divisão de comissões e gestão para salões e barbearias',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
