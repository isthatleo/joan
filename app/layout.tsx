import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "Joan Healthcare OS",
  description: "Multi-tenant Hospital Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect + stylesheet for Inter font (avoids using @import in CSS) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-subtle text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
