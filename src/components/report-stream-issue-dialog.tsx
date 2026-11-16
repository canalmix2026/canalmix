"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { submitStreamIssueAction } from "@/app/canais/issue-actions";
import type { SubmitStreamIssueState } from "@/app/canais/issue-actions";

const initialState: SubmitStreamIssueState = { success: false, message: "" };

export function ReportStreamIssueDialog({
  channelId,
  channelName,
  sourceIds,
  selectedOption,
  idempotencyKey,
  tvMode,
  onClose,
}: {
  channelId: string;
  channelName: string;
  sourceIds: string[];
  selectedOption: number;
  idempotencyKey: string;
  tvMode: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    submitStreamIssueAction,
    initialState,
  );
  const [validationMessage, setValidationMessage] = useState("");
  const selectedCheckbox = useRef<HTMLInputElement | null>(null);
  const confirmationButton = useRef<HTMLButtonElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const confirmed = state.success;

  useEffect(() => {
    selectedCheckbox.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (confirmed) {
      confirmationButton.current?.focus({ preventScroll: true });
    }
  }, [confirmed]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key)) {
      event.preventDefault();
      if (!pending) {
        onClose();
      }
      return;
    }

    if (!tvMode || !["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
      if (
        tvMode &&
        (event.key === "Enter" || event.key === "NumpadEnter") &&
        event.target instanceof HTMLInputElement &&
        event.target.type === "checkbox"
      ) {
        event.preventDefault();
        event.target.click();
      }
      return;
    }

    const controls = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>("[data-report-focus]") ?? [],
    ).filter((control) => !control.hasAttribute("disabled"));
    if (controls.length === 0) {
      return;
    }

    event.preventDefault();
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
    const direction = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex]?.focus({ preventScroll: true });
  }

  function validateSelection(event: FormEvent<HTMLFormElement>) {
    const selected = formRef.current?.querySelector(
      'input[name="sourceIds"]:checked',
    );
    if (!selected) {
      event.preventDefault();
      setValidationMessage("Selecione ao menos uma opção para enviar.");
      return;
    }
    setValidationMessage("");
  }

  return (
    <div className="stream-issue-overlay" onKeyDown={handleKeyDown}>
      <button
        aria-label="Fechar formulário de relato"
        className="stream-issue-overlay__backdrop"
        disabled={pending}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="stream-issue-title"
        aria-modal="true"
        className="stream-issue-dialog"
        role="dialog"
        ref={dialogRef}
      >
        <header className="stream-issue-dialog__header">
          <div>
            <p className="eyebrow">Ajude a melhorar a transmissão</p>
            <h2 id="stream-issue-title">Reportar problema</h2>
          </div>
          <button
            aria-label="Fechar formulário de relato"
            className="icon-button"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        {confirmed ? (
          <div className="stream-issue-confirmation" role="status">
            <span aria-hidden="true" className="stream-issue-confirmation__check">
              ✓
            </span>
            <h3>Relato recebido</h3>
            <p>{state.message}</p>
            <p>
              Protocolo <strong>{state.protocol}</strong>
            </p>
            <button
              className="primary-button"
              data-report-focus
              onClick={onClose}
              ref={confirmationButton}
              type="button"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form
            action={formAction}
            className="stream-issue-form"
            onSubmit={validateSelection}
            onChange={() => {
              setValidationMessage("");
            }}
            ref={formRef}
          >
            <input name="channelId" type="hidden" value={channelId} />
            <input
              name="idempotencyKey"
              type="hidden"
              value={idempotencyKey}
            />
            <p>
              Canal: <strong>{channelName}</strong>
            </p>
            <fieldset>
              <legend>Quais opções estão com problema?</legend>
              <div className="stream-issue-options">
                {sourceIds.map((sourceId, index) => (
                  <label className="stream-issue-option" key={sourceId}>
                    <input
                      data-report-focus
                      defaultChecked={index === selectedOption}
                      name="sourceIds"
                      onChange={() => setValidationMessage("")}
                      ref={index === selectedOption ? selectedCheckbox : undefined}
                      type="checkbox"
                      value={sourceId}
                    />
                    <span>Opção {index + 1}</span>
                    {index === selectedOption && (
                      <small>Você está assistindo</small>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="stream-issue-form__hint">
              Selecione uma ou mais opções. O envio não interrompe a transmissão.
            </p>
            {(validationMessage || state.message) && (
              <p
                aria-live="polite"
                className={
                  "stream-issue-form__feedback" +
                  (validationMessage || !state.success
                    ? " stream-issue-form__feedback--error"
                    : "")
                }
                role="status"
              >
                {validationMessage || state.message}
              </p>
            )}
            <div className="stream-issue-form__actions">
              <button
                className="secondary-button"
                data-report-focus
                disabled={pending}
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                data-report-focus
                disabled={pending}
                type="submit"
              >
                {pending ? "Enviando…" : "Enviar relato"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
