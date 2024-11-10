import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Toaster } from '@/components/ui/sonner';
import { getSiteUrl } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      template: '%s - Čakalne dobe - Sledilnik',
      default: 'Čakalne dobe - Sledilnik',
    },
    description:
      'Pregled čakalnih dob v slovenskem zdravstvu. Podatki so zbrani iz javno dostopnih virov. Podatki so zbrani za obdobje od 7. aprila 2024 dalje.',
    authors: [{ name: 'Jaka Daneu', url: 'https://github.com/jalezi' }],
    robots: {
      follow: true,
      index: true,
    },
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id?: string }>;
}

export default async function RootLayout(props: RootLayoutProps) {
  const params = await props.params;

  const {
    children
  } = props;

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative grid min-h-[100svh] grid-cols-1 grid-rows-[min-content_1fr_min-content] bg-inherit">
            <Header id={params.id} />
            {children}
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
