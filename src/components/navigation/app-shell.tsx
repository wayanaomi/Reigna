"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { Wordmark } from "@/components/brand/wordmark";

export function AppShell({
  children,
  logoSrc,
}: {
  children: React.ReactNode;
  logoSrc: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border-subtle bg-surface md:block">
        <SidebarNav logoSrc={logoSrc} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 md:hidden">
        <Wordmark className="scale-90" logoSrc={logoSrc} />
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-sm p-2 text-charcoal hover:bg-surface-muted"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-charcoal/40" />
            <Dialog.Content
              className="fixed inset-y-0 left-0 z-50 w-72 bg-purple-deep shadow-lg outline-none"
              aria-describedby={undefined}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <div className="flex justify-end px-3 pt-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    className="rounded-sm p-2 text-cream/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </Dialog.Close>
              </div>
              <SidebarNav onNavigate={() => setMobileOpen(false)} logoSrc={logoSrc} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="flex min-h-screen flex-1 flex-col pt-14 md:pt-0">
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
