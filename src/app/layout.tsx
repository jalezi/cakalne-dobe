import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Čakalne dobe - Sledilnik',
  description: 'Pregled čakalnih dob v slovenskem zdravstvu',
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: { id?: string };
}

export default function RootLayout({ children, params }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative grid min-h-[100svh] grid-rows-[min-content_1fr_min-content] bg-inherit">
              <Header id={params.id} />
              {children}
              <Footer />
            </div>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
