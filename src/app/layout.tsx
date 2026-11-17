import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppGate } from "@/components/auth/AppGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SyncErrorBanner } from "@/components/auth/SyncErrorBanner";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MealMeal",
  description: "Chụp hoặc mô tả bữa ăn, AI ước tính calories và dinh dưỡng.",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "MealMeal", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF8F3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} antialiased`}>
      <body className="bg-bg font-sans text-ink">
        <div className="mx-auto min-h-dvh max-w-[480px]">
          <AuthProvider>
            <SyncErrorBanner />
            <AppGate>{children}</AppGate>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
