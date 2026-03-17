import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'LiveFit - AI Fitness Tracker',
  description: 'AI-powered nutrition and fitness tracking application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={workSans.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
