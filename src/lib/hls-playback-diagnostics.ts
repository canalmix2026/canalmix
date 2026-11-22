import type { ErrorData } from "hls.js";

export type HlsPlaybackFailure = {
  code: string;
  kind: "http" | "network" | "media" | "other";
  stage: string;
  status: number | null;
  host: string | null;
};

export type HlsNetworkMetadata = {
  status: number | null;
  host: string | null;
};

export function getSafeHostname(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function getHlsNetworkMetadata(
  networkDetails: unknown,
  fallbackUrl?: string | null,
): HlsNetworkMetadata {
  const details =
    typeof networkDetails === "object" && networkDetails !== null
      ? (networkDetails as Record<string, unknown>)
      : {};
  const status =
    typeof details.status === "number" && details.status > 0
      ? details.status
      : null;
  const responseUrl =
    typeof details.url === "string"
      ? details.url
      : typeof details.responseURL === "string"
        ? details.responseURL
        : fallbackUrl;

  return { status, host: getSafeHostname(responseUrl) };
}

function getResourceStage(details: string) {
  const normalized = details.toLowerCase();
  if (normalized.startsWith("manifest")) return "manifesto HLS";
  if (normalized.startsWith("level")) return "playlist de qualidade";
  if (normalized.startsWith("audiotrack")) return "playlist de áudio";
  if (normalized.startsWith("subtitle")) return "playlist de legendas";
  if (normalized.startsWith("frag")) return "segmento de vídeo";
  if (normalized.startsWith("key")) return "chave de mídia";
  return "transmissão HLS";
}

export function getHlsPlaybackFailure(
  error: Pick<
    ErrorData,
    "type" | "details" | "response" | "url" | "context" | "networkDetails"
  >,
): HlsPlaybackFailure {
  const responseStatus = error.response?.code;
  const networkMetadata = getHlsNetworkMetadata(
    error.networkDetails,
    error.response?.url ?? error.url ?? error.context?.url,
  );
  const status =
    typeof responseStatus === "number" && responseStatus >= 100
      ? responseStatus
      : networkMetadata.status;
  const type = String(error.type);
  const kind: HlsPlaybackFailure["kind"] =
    status !== null
      ? "http"
      : type === "networkError"
        ? "network"
        : type === "mediaError"
          ? "media"
          : "other";
  const stage = getResourceStage(String(error.details));

  return {
    code: status !== null ? `http-${status}` : `${kind}:${String(error.details)}`,
    kind,
    stage,
    status,
    host:
      getSafeHostname(error.response?.url ?? error.url ?? error.context?.url) ??
      networkMetadata.host,
  };
}

export function getHlsPlaybackErrorMessage(failure: HlsPlaybackFailure) {
  if (failure.status === 401) {
    return `A origem exige autenticação ou sessão para carregar ${failure.stage} (HTTP 401). O CanalMix não envia credenciais do provedor.`;
  }
  if (failure.status === 403) {
    return `O provedor recusou ${failure.stage} (HTTP 403). A origem pode restringir a incorporação, a região ou a sessão do visitante.`;
  }
  if (failure.status === 404) {
    return `Não foi encontrado ${failure.stage} (HTTP 404). A fonte pode estar offline ou a sessão temporária pode ter expirado; atualize o player para tentar novamente.`;
  }
  if (failure.status !== null && failure.status >= 500) {
    return `O provedor está indisponível ao carregar ${failure.stage} (HTTP ${failure.status}). Tente novamente mais tarde.`;
  }
  if (failure.kind === "network") {
    return `O navegador não conseguiu carregar ${failure.stage}. Pode ser falha de rede ou CORS: o provedor precisa permitir GET do domínio CanalMix nos manifestos, playlists de qualidade e áudio e segmentos.`;
  }
  if (failure.kind === "media") {
    return `O navegador não conseguiu processar ${failure.stage}. O formato ou os codecs podem não ser compatíveis com este dispositivo.`;
  }
  if (failure.status !== null) {
    return `A origem respondeu HTTP ${failure.status} ao carregar ${failure.stage}. Verifique a disponibilidade e as permissões da transmissão.`;
  }
  return `Não foi possível reproduzir ${failure.stage}. Atualize o player ou abra o site oficial, se disponível.`;
}
