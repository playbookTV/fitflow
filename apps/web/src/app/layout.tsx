import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { SkipNav } from "@/components/ui/SkipNav";
import { ToastProvider } from "@/components/ui/Toast";
import "@/app/globals.css";

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm-sans",
    display: "swap",
    weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    variable: "--font-ibm-plex-mono",
    display: "swap",
    weight: ["400", "600", "700"],
});

const newsreader = Newsreader({
    subsets: ["latin"],
    variable: "--font-newsreader",
    display: "swap",
    weight: ["400", "600"],
    preload: false,
});

export const metadata: Metadata = {
    title: "FitFlow — Coaching Operations Platform",
    description:
        "Manage your coaching business from one dashboard. Clients interact via WhatsApp or Telegram.",
    themeColor: "#0a0a0b",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`dark ${dmSans.variable} ${ibmPlexMono.variable} ${newsreader.variable}`}
            style={{ colorScheme: "dark" }}
        >
            <body className="min-h-dvh bg-bg-primary antialiased">
                <SkipNav />
                <ToastProvider>{children}</ToastProvider>
            </body>
        </html>
    );
}
