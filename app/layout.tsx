import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Annakut Point System',
  description: 'Manage seva points for Annakut festival',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}