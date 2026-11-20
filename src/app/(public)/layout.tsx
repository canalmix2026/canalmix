import type { ReactNode } from "react";
import { PixDonationLayout } from "@/components/pix-donation-layout";
import { VisitorPresenceProvider } from "@/components/visitor-presence-provider";
import { getPublicPixDonationSettings } from "@/lib/pix-donations";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const presetAmountsCents = await getPublicPixDonationSettings();
  return (
    <PixDonationLayout presetAmountsCents={presetAmountsCents}>
      <VisitorPresenceProvider>{children}</VisitorPresenceProvider>
    </PixDonationLayout>
  );
}
