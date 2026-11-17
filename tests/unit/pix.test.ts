import assert from "node:assert/strict";
import test from "node:test";
import {
  crc16Ccitt,
  generateStaticPixCode,
  normalizePixDisplayText,
  parsePixAmountToCents,
  parsePixReceiverSettings,
  parsePixSettingsForAdmin,
} from "../../src/lib/pix";

function parseTlv(payload: string) {
  const fields = new Map<string, string>();
  let offset = 0;
  while (offset < payload.length) {
    const tag = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    const valueStart = offset + 4;
    const value = payload.slice(valueStart, valueStart + length);
    assert.equal(value.length, length, `campo ${tag} declara o tamanho corretamente`);
    fields.set(tag, value);
    offset = valueStart + length;
  }
  return fields;
}

test("Pix BR Code usa o mesmo payload de valor, recebedor e chave sem pedir cidade", () => {
  const code = generateStaticPixCode({
    pixKey: "chave@canalmix.com.br",
    receiverName: "CanalMix",
  }, 1550);
  const payloadWithChecksumTag = code.slice(0, -4);
  const payload = payloadWithChecksumTag.slice(0, -4);
  const fields = parseTlv(payload);
  const merchant = parseTlv(fields.get("26") ?? "");
  const extra = parseTlv(fields.get("62") ?? "");

  assert.equal(fields.get("00"), "01");
  assert.equal(merchant.get("00"), "br.gov.bcb.pix");
  assert.equal(merchant.get("01"), "chave@canalmix.com.br");
  assert.equal(fields.get("52"), "0000");
  assert.equal(fields.get("53"), "986");
  assert.equal(fields.get("54"), "15.50");
  assert.equal(fields.get("58"), "BR");
  assert.equal(fields.get("59"), "CANALMIX");
  assert.equal(fields.has("60"), false);
  assert.equal(extra.get("05"), "***");
  assert.equal(payloadWithChecksumTag.slice(-4), "6304");
  assert.equal(code.slice(-4), crc16Ccitt(payloadWithChecksumTag));
});

test("CRC16 confere com o exemplo oficial estático do Banco Central", () => {
  const sample = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
  assert.equal(crc16Ccitt(sample), "1D3D");
});

test("valores monetários são convertidos em centavos sem arredondamento binário", () => {
  assert.equal(parsePixAmountToCents("10"), 1000);
  assert.equal(parsePixAmountToCents("20,00"), 2000);
  assert.equal(parsePixAmountToCents("30.00"), 3000);
  assert.equal(parsePixAmountToCents("15,50"), 1550);
  assert.equal(parsePixAmountToCents("0"), null);
  assert.equal(parsePixAmountToCents("-1,00"), null);
  assert.equal(parsePixAmountToCents("1,999"), null);
  assert.equal(parsePixAmountToCents(15.5), null);
  assert.equal(parsePixAmountToCents("99999999999"), null);
});

test("dados do recebedor não exigem nem consultam campo de cidade", () => {
  assert.equal(normalizePixDisplayText("São Paulo - SP"), "SAO PAULO - SP");
  assert.deepEqual(parsePixReceiverSettings({
    pixKey: "chave@canalmix.com.br",
    receiverName: "CanalMix",
  }), {
    success: true,
    settings: { pixKey: "chave@canalmix.com.br", receiverName: "CANALMIX" },
  });
  assert.equal(parsePixReceiverSettings({
    pixKey: "x".repeat(78),
    receiverName: "CanalMix",
  }).success, false);
  assert.equal(parsePixReceiverSettings({
    pixKey: "key",
    receiverName: "Nome do recebedor maior que vinte e cinco caracteres",
  }).success, false);
});

test("admin valida e converte os três valores configuráveis para centavos", () => {
  assert.deepEqual(parsePixSettingsForAdmin({
    pixKey: "",
    receiverName: "",
    isActive: false,
    presetAmounts: ["10,00", "20,00", "15,50"],
  }), {
    success: true,
    settings: {
      pixKey: "",
      receiverName: "",
      isActive: false,
      presetAmountsCents: [1000, 2000, 1550],
    },
  });
  assert.equal(parsePixSettingsForAdmin({
    pixKey: "",
    receiverName: "",
    isActive: false,
    presetAmounts: ["10", "0", "30"],
  }).success, false);
});
