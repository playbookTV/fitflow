import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: "FitFlow — WhatsApp-Native Trainer CRM",
    description:
        "Manage your coaching business from one dashboard. Clients interact via WhatsApp.",
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
