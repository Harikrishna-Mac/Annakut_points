import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Annakut Point System",
  description: "Manage seva points for Annakut festival",
  themeColor: "#610094",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ PWA & iOS Support */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="Annakut Point System"
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50`}>
        {/* ✅ Clerk should wrap inside body */}
        <ClerkProvider>
          {children}
          <Footer />
        </ClerkProvider>
      </body>
    </html>
  );
}
