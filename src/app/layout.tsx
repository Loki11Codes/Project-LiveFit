import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LiveFit — AI Fitness Tracker',
  description: 'AI-powered nutrition and fitness tracking application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;1,200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
