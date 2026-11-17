"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, Heart, X } from "lucide-react";
import { PixQrCode } from "@/components/pix-qr-code";
import { formatPixAmount } from "@/lib/pix";

type GeneratedPix = { code: string; amountCents: number; formattedAmount: string };

const STORAGE_KEY = "canalmix.pix-donations.hidden.v1";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatPresetLabel(cents: number) {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return cents % 100 === 0 ? `R$ ${whole}` : `R$ ${whole},${fraction}`;
}

export function PixDonationLayout({
  presetAmountsCents,
  children,
}: {
  presetAmountsCents: [number, number, number] | null;
  children: ReactNode;
}) {
  const enabled = presetAmountsCents !== null;
  const presetAmounts = presetAmountsCents ?? [1000, 2000, 3000];
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [amount, setAmount] = useState(() => formatPixAmount(presetAmounts[0]));
  const [otherAmount, setOtherAmount] = useState("");
  const [customSelected, setCustomSelected] = useState(false);
  const [generated, setGenerated] = useState<GeneratedPix | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const supportButtonRef = useRef<HTMLButtonElement>(null);
  const firstAmountRef = useRef<HTMLButtonElement>(null);
  const restoreSupportFocusRef = useRef(false);
  const focusOnOpenRef = useRef(false);

  const fromTv = pathname === "/tv" || (
    pathname === "/grade" && typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("from") === "tv"
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== "hidden");
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (restoreSupportFocusRef.current && !open) {
      restoreSupportFocusRef.current = false;
      supportButtonRef.current?.focus();
    } else if (focusOnOpenRef.current && open) {
      focusOnOpenRef.current = false;
      firstAmountRef.current?.focus();
    }
  }, [open, ready]);

  function updateOpen(nextOpen: boolean) {
    window.localStorage.setItem(STORAGE_KEY, nextOpen ? "open" : "hidden");
    setOpen(nextOpen);
  }

  function clearGenerated() {
    setGenerated(null);
    setMessage("");
    setCopied(false);
  }

  function selectPreset(value: string) {
    setCustomSelected(false);
    setAmount(value);
    clearGenerated();
  }

  function selectOtherAmount() {
    setCustomSelected(true);
    setOtherAmount("");
    setAmount("");
    clearGenerated();
  }

  async function generatePix() {
    setPending(true);
    setMessage("");
    setCopied(false);
    setGenerated(null);
    try {
      const response = await fetch("/api/pix/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: customSelected ? otherAmount : amount }),
      });
      const result = await response.json() as GeneratedPix & { success: boolean; message?: string };
      if (!response.ok || !result.success) {
        setMessage(result.message ?? "Não foi possível gerar o Pix.");
        return;
      }
      setGenerated({
        code: result.code,
        amountCents: result.amountCents,
        formattedAmount: result.formattedAmount,
      });
    } catch {
      setMessage("Não foi possível gerar o Pix. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function copyPixCode() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.code);
      setCopied(true);
      setMessage("Código Pix copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Selecione e copie o código Pix.");
    }
  }

  function hidePanel() {
    restoreSupportFocusRef.current = true;
    updateOpen(false);
  }

  function showPanel() {
    focusOnOpenRef.current = fromTv;
    updateOpen(true);
  }

  function handleTvNavigation(event: KeyboardEvent<HTMLDivElement>) {
    if (fromTv && ["OK", "Accept", "Select"].includes(event.key)) {
      const active = event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>("[data-pix-tv-item]")
        : null;
      if (active && !active.hasAttribute("disabled")) {
        event.preventDefault();
        active.click();
      }
      return;
    }
    if (!fromTv || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const active = (event.target as HTMLElement).closest<HTMLElement>("[data-pix-tv-item]");
    if (!active) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-pix-tv-item]"),
    ).filter((item) => item.getClientRects().length > 0 && !item.hasAttribute("disabled"));
    const rect = active.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) return;
    const [dx, dy] = direction;
    const next = items
      .filter((item) => item !== active)
      .map((item) => {
        const candidate = item.getBoundingClientRect();
        const deltaX = candidate.left + candidate.width / 2 - x;
        const deltaY = candidate.top + candidate.height / 2 - y;
        const forward = dx ? deltaX * dx : deltaY * dy;
        const cross = dx ? Math.abs(deltaY) : Math.abs(deltaX);
        return { item, score: forward > 0 ? forward + cross * 1.7 : Number.POSITIVE_INFINITY };
      })
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((a, b) => a.score - b.score)[0]?.item;
    if (next) {
      event.preventDefault();
      next.focus({ preventScroll: false });
    }
  }

  return (
    <div
      className={`public-site-layout${ready && enabled && open ? " public-site-layout--donation-open" : ""}`}
      onKeyDown={handleTvNavigation}
    >
      <div className="public-site-layout__main">{children}</div>

      {ready && enabled && open && (
        <aside aria-label="Apoie o CanalMix" className="pix-donation-aside">
          <section aria-labelledby="pix-donation-title" className="pix-tv">
            <div aria-hidden="true" className="pix-tv__antenna">
              <span />
              <span />
            </div>
            <div className="pix-tv__cabinet">
              <div className="pix-tv__screen">
                <header className="pix-tv__screen-header">
                  <h2 id="pix-donation-title">Curtiu o CanalMix?</h2>
                  <button
                    aria-label="Ocultar painel de apoio"
                    className="pix-tv__hide"
                    data-pix-tv-item
                    onClick={hidePanel}
                    type="button"
                  >
                    <X aria-hidden="true" size={15} />
                    <span>Ocultar</span>
                  </button>
                </header>

                <div className="pix-tv__content">
                  <p className="pix-tv__description">
                    Seu Pix ajuda a manter o CanalMix no ar e grátis pra todos. Qualquer valor faz diferença! 💜
                  </p>

                  <div aria-label="Escolha o valor do apoio" className="pix-tv__amounts">
                    {presetAmounts.map((amountCents, index) => {
                      const value = formatPixAmount(amountCents);
                      return (
                      <button
                        aria-pressed={!customSelected && amount === value}
                        className={`pix-tv__amount${!customSelected && amount === value ? " is-selected" : ""}`}
                        data-pix-tv-item
                        key={`${index}-${value}`}
                        onClick={() => selectPreset(value)}
                        ref={index === 0 ? firstAmountRef : undefined}
                        type="button"
                      >
                        {formatPresetLabel(amountCents)}
                      </button>
                      );
                    })}
                    <button
                      aria-pressed={customSelected}
                      className={`pix-tv__amount${customSelected ? " is-selected" : ""}`}
                      data-pix-tv-item
                      onClick={selectOtherAmount}
                      type="button"
                    >
                      Outro valor
                    </button>
                  </div>

                  {customSelected && (
                    <label className="pix-tv__custom-field">
                      <span>Valor em reais</span>
                      <span className="pix-tv__custom-input-wrap">
                        <span aria-hidden="true">R$</span>
                        <input
                          aria-label="Outro valor em reais"
                          autoComplete="off"
                          inputMode="decimal"
                          maxLength={13}
                          onChange={(event) => {
                            setOtherAmount(event.target.value);
                            setAmount(event.target.value);
                            clearGenerated();
                          }}
                          placeholder="15,50"
                          type="text"
                          value={otherAmount}
                        />
                      </span>
                    </label>
                  )}

                  <button
                    className="pix-tv__generate"
                    data-pix-tv-item
                    disabled={pending}
                    onClick={generatePix}
                    type="button"
                  >
                    {pending ? "Gerando…" : "Gerar Pix"}
                  </button>

                  {generated && (
                    <section aria-label="Pix gerado" className="pix-tv__result">
                      <p className="pix-tv__generated-title"><Check aria-hidden="true" size={17} /> Pix gerado</p>
                      <p className="pix-tv__generated-amount">{formatCurrency(generated.amountCents)}</p>
                      <PixQrCode value={generated.code} size={152} />
                      <label className="pix-tv__copy-label">
                        <span>Pix Copia e Cola</span>
                        <textarea aria-label="Código Pix Copia e Cola" readOnly value={generated.code} />
                      </label>
                      <button
                        className="pix-tv__copy"
                        data-pix-tv-item
                        onClick={copyPixCode}
                        type="button"
                      >
                        {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
                        {copied ? "Código copiado" : "Copiar código Pix"}
                      </button>
                      <p className="pix-tv__disclaimer">
                        A geração do código não confirma pagamento. O apoio é voluntário e não exige login.
                      </p>
                    </section>
                  )}

                  {message && <p aria-live="polite" className="pix-tv__message" role="status">{message}</p>}
                </div>
              </div>

              <div aria-hidden="true" className="pix-tv__controls">
                <span className="pix-tv__dial"><i /></span>
                <span className="pix-tv__dial"><i /></span>
                <span className="pix-tv__speaker"><i /><i /><i /></span>
              </div>
            </div>
            <div aria-hidden="true" className="pix-tv__feet"><span /><span /></div>
          </section>
        </aside>
      )}

      {ready && enabled && !open && (
        <button
          aria-label="Apoiar o CanalMix via Pix"
          className="pix-donation-launcher"
          data-pix-tv-item
          onClick={showPanel}
          ref={supportButtonRef}
          type="button"
        >
          <Heart aria-hidden="true" size={17} />
          <span>Apoiar</span>
        </button>
      )}
    </div>
  );
}
