import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPixAmount, generateStaticPixCode, parsePixAmountToCents } from "@/lib/pix";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Confira o valor informado." }, { status: 400 });
  }

  const amountCents = body && typeof body === "object"
    ? parsePixAmountToCents((body as Record<string, unknown>).amount)
    : null;
  if (amountCents === null) {
    return NextResponse.json({ success: false, message: "Informe um valor positivo com até duas casas decimais." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "O Pix ainda não está configurado." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("pix_donation_settings")
    .select("pix_key, receiver_name, is_active")
    .eq("id", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ success: false, message: "O Pix não está disponível no momento." }, { status: 404 });
  }

  try {
    const code = generateStaticPixCode({
      pixKey: data.pix_key,
      receiverName: data.receiver_name,
    }, amountCents);
    return NextResponse.json({
      success: true,
      amountCents,
      formattedAmount: formatPixAmount(amountCents),
      code,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Não foi possível gerar este Pix. Confira a configuração do recebedor." }, { status: 503 });
  }
}
