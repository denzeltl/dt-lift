import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DatabaseProvider } from "@/context/DatabaseContext";
import { WorkoutProvider } from "@/context/WorkoutContext";
import BottomNav from "@/components/BottomNav";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carry Lift - PWA Gym Workout Tracker",
  description: "Carry Lift is a premium, mobile-first gym tracker progressive web application for tracking workouts, templates, and weights.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Carry Lift",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 pb-24">
        <DatabaseProvider>
          <WorkoutProvider>
            <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
              {children}
            </main>
            <BottomNav />
            <PWARegister />
          </WorkoutProvider>
        </DatabaseProvider>
      </body>
    </html>
  );
}
