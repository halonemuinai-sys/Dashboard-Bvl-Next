import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { HideAmountsProvider } from "@/lib/hide-amounts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bvlgari BI Dashboard",
  description: "Real-time Business Intelligence for Bvlgari Retail",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 text-slate-900`}>
        <HideAmountsProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </HideAmountsProvider>
      </body>
    </html>
  );
}
