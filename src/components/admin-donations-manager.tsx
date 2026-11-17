"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { PixQrCode } from "@/components/pix-qr-code";
import { savePixDonationSettingsAction, testPixDonationAction } from "@/app/admin/donation-actions";

type AdminDonationFormSettings = {
  pixKey: string;
  receiverName: string;
  isActive: boolean;
  presetAmounts: [string, string, string];
};

export function AdminDonationsManager({
  initialSettings,
}: {
  initialSettings: AdminDonationFormSettings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [testAmount, setTestAmount] = useState("10,00");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [preview, setPreview] = useState<{ code: string; amountCents: number } | null>(null);
  const [copied, setCopied] = useState(false);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageIsError(false);
    const result = await savePixDonationSettingsAction(settings);
    setSaving(false);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) router.refresh();
  }

  async function testSettings() {
    setTesting(true);
    setMessage("");
    setMessageIsError(false);
    setCopied(false);
    setPreview(null);
    const result = await testPixDonationAction(settings, testAmount);
    setTesting(false);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success && result.code && result.amountCents !== undefined) {
      setPreview({ code: result.code, amountCents: result.amountCents });
    }
  }

  async function copyPreview() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.code);
      setCopied(true);
    } catch {
      setMessage("Não foi possível copiar. Selecione e copie o código Pix.");
      setMessageIsError(true);
    }
  }

  return (
    <div className="admin-donations-manager">
      <p className="admin-donations-manager__intro">
        Cadastre os dados que aparecerão no QR Code estático. A chave Pix é pública para quem escolhe gerar um código.
      </p>
      <form className="admin-donations-form" onSubmit={saveSettings}>
        <label>
          <span>Chave Pix</span>
          <input
            autoComplete="off"
            maxLength={77}
            onChange={(event) => setSettings((current) => ({ ...current, pixKey: event.target.value }))}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            spellCheck={false}
            type="text"
            value={settings.pixKey}
          />
        </label>
        <div className="admin-donations-form__row">
          <label>
            <span>Nome do recebedor</span>
            <input
              maxLength={25}
              onChange={(event) => setSettings((current) => ({ ...current, receiverName: event.target.value }))}
              placeholder="CanalMix"
              type="text"
              value={settings.receiverName}
            />
            <small>Até 25 caracteres; será convertido para maiúsculas sem acentos no BR Code.</small>
          </label>
        </div>
        <div className="admin-donations-form__amounts">
          {settings.presetAmounts.map((value, index) => (
            <label key={index}>
              <span>Valor predefinido {index + 1}</span>
              <input
                aria-label={`Valor predefinido ${index + 1}`}
                inputMode="decimal"
                onChange={(event) => setSettings((current) => {
                  const presetAmounts = [...current.presetAmounts] as [string, string, string];
                  presetAmounts[index] = event.target.value;
                  return { ...current, presetAmounts };
                })}
                placeholder={index === 0 ? "10,00" : index === 1 ? "20,00" : "30,00"}
                value={value}
              />
              <small>Valor exibido como opção de apoio no painel público.</small>
            </label>
          ))}
        </div>
        <label className="admin-donations-form__toggle">
          <input
            checked={settings.isActive}
            onChange={(event) => setSettings((current) => ({ ...current, isActive: event.target.checked }))}
            type="checkbox"
          />
          <span>
            <strong>Ativar doações</strong>
            <small>Ao desativar, o painel e o botão “Apoiar” deixam de aparecer no site público.</small>
          </span>
        </label>

        <div className="admin-donations-form__actions">
          <button className="admin-donations-form__save" disabled={saving} type="submit">
            {saving ? "Salvando…" : "Salvar configurações"}
          </button>
          <label className="admin-donations-form__test-amount">
            <span>Valor de teste</span>
            <input
              aria-label="Valor para testar Pix"
              inputMode="decimal"
              onChange={(event) => setTestAmount(event.target.value)}
              value={testAmount}
            />
          </label>
          <button className="admin-donations-form__test" disabled={testing} onClick={testSettings} type="button">
            {testing ? "Testando…" : "Testar Pix"}
          </button>
        </div>
      </form>

      {message && (
        <p aria-live="polite" className={`admin-donations-manager__message${messageIsError ? " is-error" : ""}`} role="status">
          {message}
        </p>
      )}

      {preview && (
        <section aria-label="Prévia Pix de teste" className="admin-donations-preview">
          <div>
            <p className="admin-donations-preview__title"><Check aria-hidden="true" size={18} /> Pix gerado para teste</p>
            <p className="admin-donations-preview__amount">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(preview.amountCents / 100)}
            </p>
            <p className="admin-donations-preview__notice">Prévia de código. A geração não confirma pagamento.</p>
          </div>
          <PixQrCode size={180} value={preview.code} />
          <label>
            <span>Pix Copia e Cola</span>
            <textarea aria-label="Prévia do código Pix Copia e Cola" readOnly value={preview.code} />
          </label>
          <button className="admin-donations-form__test" onClick={copyPreview} type="button">
            {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
            {copied ? "Código copiado" : "Copiar código Pix"}
          </button>
        </section>
      )}
    </div>
  );
}
