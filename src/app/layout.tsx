import type {Metadata} from 'next';
import './globals.css';
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/next"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { UserProvider } from "@/lib/user-context"
import { RevenueCatInitializer } from "@/lib/revenuecat"

export const metadata: Metadata = {
  title: 'Prompt Keeper: Your Prompt Repository & Sharing App',
  description: 'A prompt repository to store, organize, and share your AI prompts with your team and the community.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Favicon links */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={cn("font-body antialiased")} suppressHydrationWarning>
        <UserProvider>
          <RevenueCatInitializer />
          {children}
        </UserProvider>
        <Toaster />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
