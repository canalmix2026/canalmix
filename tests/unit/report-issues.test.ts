import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { submitStreamIssueAction } from "@/app/canais/issue-actions";

test("servidor rejeita relato sem opção selecionada", async () => {
  const formData = new FormData();
  formData.set("channelId", randomUUID());
  formData.set("idempotencyKey", randomUUID());

  const result = await submitStreamIssueAction(
    { success: false, message: "" },
    formData,
  );

  assert.equal(result.success, false);
  assert.equal(result.message, "Selecione ao menos uma opção.");
});

test("servidor rejeita IDs de fonte duplicados no mesmo envio", async () => {
  const duplicateSourceId = randomUUID();
  const formData = new FormData();
  formData.set("channelId", randomUUID());
  formData.set("idempotencyKey", randomUUID());
  formData.append("sourceIds", duplicateSourceId);
  formData.append("sourceIds", duplicateSourceId);

  const result = await submitStreamIssueAction(
    { success: false, message: "" },
    formData,
  );

  assert.equal(result.success, false);
  assert.equal(result.message, "Remova opções repetidas e tente novamente.");
});
