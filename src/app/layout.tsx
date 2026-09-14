import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { HideAmountsProvider } from "@/lib/hide-amounts";
import { UserAccessProvider } from "@/lib/user-access-context";

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
      <body className="font-sans bg-slate-100 text-slate-900">
        <UserAccessProvider>
          <HideAmountsProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </HideAmountsProvider>
        </UserAccessProvider>
      </body>
    </html>
  );
}
