import { AppShell } from "@/components/navigation/app-shell";
import { resolveWordmarkAsset } from "@/lib/brand-assets";
import { requireOwnerId } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOwnerId();
  const logoSrc = resolveWordmarkAsset();
  return <AppShell logoSrc={logoSrc}>{children}</AppShell>;
}
