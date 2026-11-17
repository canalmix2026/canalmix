"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatPixAmount,
  generateStaticPixCode,
  parsePixAmountToCents,
  parsePixReceiverSettings,
  parsePixSettingsForAdmin,
} from "@/lib/pix";

export type DonationAdminActionResult = {
  success: boolean;
  message: string;
  code?: string;
  amountCents?: number;
  formattedAmount?: string;
};

async function getAuthorizedDonationAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("catalog_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .maybeSingle();
  if (membershipError || !membership) return null;

  return supabase;
}

export async function savePixDonationSettingsAction(input: unknown): Promise<DonationAdminActionResult> {
  const supabase = await getAuthorizedDonationAdmin();
  if (!supabase) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const parsed = parsePixSettingsForAdmin(input);
  if (!parsed.success) return { success: false, message: parsed.message };

  const { data, error } = await supabase
    .from("pix_donation_settings")
    .update({
      pix_key: parsed.settings.pixKey,
      receiver_name: parsed.settings.receiverName,
      is_active: parsed.settings.isActive,
      preset_amount_1_cents: parsed.settings.presetAmountsCents[0],
      preset_amount_2_cents: parsed.settings.presetAmountsCents[1],
      preset_amount_3_cents: parsed.settings.presetAmountsCents[2],
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Falha ao salvar as configurações Pix:", error?.code);
    return { success: false, message: "Não foi possível salvar as configurações Pix." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/doacoes");
  const complete = Boolean(parsed.settings.pixKey && parsed.settings.receiverName);
  return {
    success: true,
    message: parsed.settings.isActive && !complete
      ? "Configurações salvas. Preencha os dados do recebedor para exibir o painel público."
      : "Configurações Pix salvas.",
  };
}

export async function testPixDonationAction(
  settingsInput: unknown,
  amountInput: unknown,
): Promise<DonationAdminActionResult> {
  const supabase = await getAuthorizedDonationAdmin();
  if (!supabase) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const parsedSettings = parsePixReceiverSettings(settingsInput);
  if (!parsedSettings.success) return { success: false, message: parsedSettings.message };
  const amountCents = parsePixAmountToCents(amountInput);
  if (amountCents === null) {
    return { success: false, message: "Informe um valor positivo com até duas casas decimais." };
  }

  try {
    return {
      success: true,
      message: "Prévia Pix gerada. Ela não confirma pagamento.",
      code: generateStaticPixCode(parsedSettings.settings, amountCents),
      amountCents,
      formattedAmount: formatPixAmount(amountCents),
    };
  } catch {
    return { success: false, message: "Não foi possível gerar a prévia. Confira os dados do recebedor." };
  }
}
