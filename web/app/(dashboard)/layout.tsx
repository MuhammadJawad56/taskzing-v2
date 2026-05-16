import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
      <DashboardLayout>{children}</DashboardLayout>
      </LanguageProvider>
    </ThemeProvider>
  );
}

