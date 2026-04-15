rt { Inter, JetBrains_Mono } from "next/font/google"; // Assuming these imports
import { cn } from "@/lib/utils"; // Assuming cn utility

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-mono", jetbrainsMono.variable)} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}