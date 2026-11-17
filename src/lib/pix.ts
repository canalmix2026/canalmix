export type PixReceiverSettings = {
  pixKey: string;
  receiverName: string;
};

export type PixDonationSettings = PixReceiverSettings & {
  isActive: boolean;
  presetAmountsCents: [number, number, number];
};

export type ParsedPixSettings = {
  success: true;
  settings: PixReceiverSettings;
} | {
  success: false;
  message: string;
};

const MAX_PIX_AMOUNT_CENTS = 999_999_999_999;

export function normalizePixDisplayText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePixReceiverSettings(value: unknown): ParsedPixSettings {
  if (!value || typeof value !== "object") {
    return { success: false, message: "Confira os dados do recebedor." };
  }

  const raw = value as Record<string, unknown>;
  const pixKey = typeof raw.pixKey === "string" ? raw.pixKey.trim() : "";
  const receiverNameInput = typeof raw.receiverName === "string" ? raw.receiverName.trim() : "";
  const receiverName = normalizePixDisplayText(receiverNameInput);

  if (!pixKey || pixKey.length > 77 || !/^[\x21-\x7e]+$/.test(pixKey)) {
    return { success: false, message: "Informe uma chave Pix válida, com até 77 caracteres." };
  }
  if (!receiverName || receiverName.length > 25) {
    return { success: false, message: "O nome do recebedor deve ter de 1 a 25 caracteres." };
  }

  return { success: true, settings: { pixKey, receiverName } };
}

export function parsePixAmountToCents(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_PIX_AMOUNT_CENTS) {
    return null;
  }
  return cents;
}

export function parsePixSettingsForAdmin(value: unknown): {
  success: true;
  settings: PixDonationSettings;
} | {
  success: false;
  message: string;
} {
  if (!value || typeof value !== "object") {
    return { success: false, message: "Confira os dados do recebedor." };
  }

  const raw = value as Record<string, unknown>;
  const pixKey = typeof raw.pixKey === "string" ? raw.pixKey.trim() : "";
  const receiverNameInput = typeof raw.receiverName === "string" ? raw.receiverName.trim() : "";
  const receiverName = normalizePixDisplayText(receiverNameInput);
  const presetInputs = Array.isArray(raw.presetAmounts) ? raw.presetAmounts : [];
  const presetAmountsCents = presetInputs.map(parsePixAmountToCents);

  if (typeof raw.isActive !== "boolean") {
    return { success: false, message: "Informe se as doações Pix estão ativas." };
  }
  if (pixKey.length > 77 || (pixKey && !/^[\x21-\x7e]+$/.test(pixKey))) {
    return { success: false, message: "A chave Pix deve ter até 77 caracteres imprimíveis." };
  }
  if ((receiverNameInput && !receiverName) || receiverName.length > 25) {
    return { success: false, message: "O nome do recebedor deve ter até 25 caracteres válidos." };
  }
  if (presetInputs.length !== 3 || presetAmountsCents.some((amount) => amount === null)) {
    return { success: false, message: "Informe três valores predefinidos positivos, com até duas casas decimais." };
  }

  return {
    success: true,
    settings: {
      pixKey,
      receiverName,
      isActive: raw.isActive,
      presetAmountsCents: presetAmountsCents as [number, number, number],
    },
  };
}

export function formatPixAmount(cents: number) {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function tlv(tag: string, value: string) {
  const length = Buffer.byteLength(value, "ascii");
  if (length > 99) throw new Error("Campo BR Code excede o limite de tamanho.");
  return `${tag}${String(length).padStart(2, "0")}${value}`;
}

export function crc16Ccitt(payload: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(payload, "ascii")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generateStaticPixCode(settingsInput: unknown, amountCents: number) {
  const parsedSettings = parsePixReceiverSettings(settingsInput);
  if (!parsedSettings.success) throw new Error(parsedSettings.message);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_PIX_AMOUNT_CENTS) {
    throw new Error("Informe um valor positivo para gerar o Pix.");
  }

  const settings = parsedSettings.settings;
  const amount = formatPixAmount(amountCents);
  if (amount.length > 13) throw new Error("O valor ultrapassa o limite do BR Code Pix.");

  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", settings.pixKey);
  const payload = [
    tlv("00", "01"),
    tlv("26", merchantAccount),
    tlv("52", "0000"),
    tlv("53", "986"),
    tlv("54", amount),
    tlv("58", "BR"),
    tlv("59", settings.receiverName),
    tlv("62", tlv("05", "***")),
    "6304",
  ].join("");
  return `${payload}${crc16Ccitt(payload)}`;
}
