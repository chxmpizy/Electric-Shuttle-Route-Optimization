import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Electric Shuttle Route Optimization - TU Rangsit",
  description: "Metaheuristic Optimization Dashboard for TU Rangsit Electric Shuttles",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
