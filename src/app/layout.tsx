import type { Metadata, Viewport } from "next";
import { Stardos_Stencil, IBM_Plex_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { DatabaseProvider } from "@/context/DatabaseContext";
import { WorkoutProvider } from "@/context/WorkoutContext";
import BottomNav from "@/components/BottomNav";
import PWARegister from "@/components/PWARegister";

const stencil = Stardos_Stencil({
    variable: "--font-stencil",
    weight: ["400", "700"],
    subsets: ["latin"],
});

const body = IBM_Plex_Sans_Condensed({
    variable: "--font-body",
    weight: ["400", "500", "600", "700"],
    style: ["normal", "italic"],
    subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
    variable: "--font-plex-mono",
    weight: ["500", "600"],
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://dt-lift.vercel.app"),
    title: "DT Lift - Gym Workout Tracker",
    description: "Log every set, run your workout templates and track your training volume. Works offline.",
    applicationName: "DT Lift",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "48x48" },
            { url: "/favicon.svg", type: "image/svg+xml" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
        title: "DT Lift - Gym Workout Tracker",
        description: "Log every set, run your workout templates and track your training volume. Works offline.",
        siteName: "DT Lift",
        type: "website",
    },
    twitter: { card: "summary_large_image" },
    appleWebApp: {
        capable: true,
        title: "DT Lift",
        statusBarStyle: "default",
    },
};

export const viewport: Viewport = {
    themeColor: "#F4EFE6",
    colorScheme: "light",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${stencil.variable} ${body.variable} ${plexMono.variable} h-full antialiased`}>
            <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 pb-28">
                <DatabaseProvider>
                    <WorkoutProvider>
                        <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-5">{children}</main>
                        <BottomNav />
                        <PWARegister />
                    </WorkoutProvider>
                </DatabaseProvider>
            </body>
        </html>
    );
}
