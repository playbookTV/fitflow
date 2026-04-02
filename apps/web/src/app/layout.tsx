import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: "FitFlow — Coaching Operations Platform",
    description:
        "Manage your coaching business from one dashboard. Clients interact via WhatsApp or Telegram.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-bg-primary antialiased">{children}</body>
        </html>
    );
}
