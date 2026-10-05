import type { Metadata } from "next";
import "./explorer.css";
import "./polish.css";
import "./universe.css";

export const metadata: Metadata = {
  title: "Kubernetes Observatory — Architecture in motion",
  description: "A vendor-neutral interactive Kubernetes architecture explorer.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
