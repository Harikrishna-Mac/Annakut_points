import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Head from 'next/head'

const inter = Inter({ subsets: ["latin"] });

// export const metadata = {
//   title: "Annakut Point System",
//   description: "Manage seva points for Annakut festival",
//   themeColor: "#610094",
//   manifest: "/manifest.json",
// };
export const metadata = {
  title: "Annakut Point System",
  description: "Manage seva points for Annakut festival",
  themeColor: "#610094",
  icons: [
    { rel: "icon", url: "/icon-192.png" },
    { rel: "apple-touch-icon", url: "/icon-192.png" }
  ],
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
