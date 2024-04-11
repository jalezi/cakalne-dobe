import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { ThemeToggler } from '@/components/theme-toggler';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Čakalne dobe - Sledilnik',
  description: 'Pregled čakalnih dob v slovenskem zdravstvu',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
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
            <header className="flex p-4">
              <Link href="/">
                <h1>Čakalne dobe</h1>
              </Link>
              <ThemeToggler className="ml-auto" />
            </header>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
