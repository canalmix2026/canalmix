"use server";

import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export type SubmitStreamIssueState = {
  success: boolean;
  message: string;
  protocol?: string;
};

const uuidSchema = z.string().uuid();

export async function submitStreamIssueAction(
  _previousState: SubmitStreamIssueState,
  formData: FormData,
): Promise<SubmitStreamIssueState> {
  const channelId = formData.get("channelId");
  const idempotencyKey = formData.get("idempotencyKey");
  const rawSourceIds = formData.getAll("sourceIds");

  const parsedChannelId = uuidSchema.safeParse(channelId);
  const parsedIdempotencyKey = uuidSchema.safeParse(idempotencyKey);
  const parsedSourceIds = z
    .array(uuidSchema)
    .min(1, "Selecione ao menos uma opção.")
    .max(32, "O limite é de 32 opções por relato.")
    .safeParse(rawSourceIds);

  if (!parsedChannelId.success || !parsedIdempotencyKey.success) {
    return { success: false, message: "Não foi possível identificar o canal. Atualize a página e tente novamente." };
  }
  if (!parsedSourceIds.success) {
    return {
      success: false,
      message: parsedSourceIds.error.issues[0]?.message ?? "Selecione ao menos uma opção.",
    };
  }
  if (new Set(parsedSourceIds.data).size !== parsedSourceIds.data.length) {
    return { success: false, message: "Remova opções repetidas e tente novamente." };
  }

  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) {
    return {
      success: false,
      message: "O registro de problemas não está configurado neste ambiente.",
    };
  }

  const requestHeaders = await headers();
  const forwardedAddress = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")
    .map((address) => address.trim())
    .filter(Boolean)
    .at(-1);
  const clientAddress =
    requestHeaders.get("x-real-ip")?.trim() || forwardedAddress || "unknown";
  const fingerprintHash = createHmac("sha256", serviceRoleKey)
    .update(clientAddress)
    .digest("hex");

  const supabase = createClient<Database>(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("submit_stream_issue", {
    p_channel_id: parsedChannelId.data,
    p_selected_source_ids: parsedSourceIds.data,
    p_idempotency_key: parsedIdempotencyKey.data,
    p_fingerprint_hash: fingerprintHash,
  });

  if (error) {
    if (error.message.includes("invalid_options")) {
      return {
        success: false,
        message: "Uma das opções não pertence mais a este canal. Atualize a página e tente novamente.",
      };
    }
    if (error.message.includes("invalid_channel")) {
      return { success: false, message: "Este canal não está mais disponível para relatos." };
    }
    if (error.message.includes("rate_limited")) {
      return {
        success: false,
        message: "Você enviou vários relatos recentemente. Aguarde alguns minutos para tentar de novo.",
      };
    }
    console.error("Falha ao registrar problema de transmissão:", error.code);
    return {
      success: false,
      message: "Não foi possível salvar o relato agora. Tente novamente em instantes.",
    };
  }

  const receipt = data?.[0];
  if (!receipt) {
    return {
      success: false,
      message: "Não foi possível confirmar o protocolo. Tente novamente em instantes.",
    };
  }

  revalidatePath("/admin/canais");
  return {
    success: true,
    message: receipt.duplicate
      ? "Este relato já havia sido recebido."
      : "Problema reportado com sucesso.",
    protocol: receipt.protocol,
  };
}
