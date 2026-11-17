import "server-only";
import { parsePixReceiverSettings } from "@/lib/pix";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getPublicPixDonationSettings(): Promise<[number, number, number] | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("pix_donation_settings")
    .select("pix_key, receiver_name, is_active, preset_amount_1_cents, preset_amount_2_cents, preset_amount_3_cents")
    .eq("id", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.is_active) return null;
  if (!parsePixReceiverSettings({
    pixKey: data.pix_key,
    receiverName: data.receiver_name,
  }).success) return null;

  return [data.preset_amount_1_cents, data.preset_amount_2_cents, data.preset_amount_3_cents];
}
