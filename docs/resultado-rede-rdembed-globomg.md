# Verificação do embed RD Embed

**Data:** 9 de novembro de 2026  
**URL testada:** `https://v1.rdembed.lat/globomg`  
**Ambiente:** CanalMix local em `127.0.0.1:3000`, Chromium via Playwright.

O canal temporário foi aberto pela rota pública do CanalMix. Na captura das respostas de rede, o documento do embed retornou **HTTP 403** com o sandbox atual (`allow-scripts allow-same-origin allow-presentation`). A mesma requisição retornou **HTTP 403** após remover o atributo `sandbox` e recarregar o iframe.

Foi consultada a [documentação pública da API do Rei dos Embeds](https://reidosembeds.lat/doc). Ela mostra URLs de embed em `v1.rdembed.lat`, mas não documenta tokens de sandbox nem exige a remoção do atributo.

## Comparação de carregamento

Em uma sessão nova do Chromium, a abertura direta de `https://v1.rdembed.lat/globomg` respondeu **HTTP 200**, carregou a página interna `/__play/globomg` e criou um player de vídeo em um frame filho. A requisição direta não enviou `Referer`.

Um iframe na origem local `http://127.0.0.1:3000` enviou `Referer: http://127.0.0.1:3000/` e recebeu **HTTP 403**. Em um contexto separado, ao usar `referrerPolicy="no-referrer"`, o iframe e a página interna responderam **HTTP 200**, sem erros de console, e o frame filho criou um elemento de vídeo.

Depois da correção, a página real do CanalMix foi testada usando um canal temporário publicado com a URL de RD Embed. A rota respondeu **HTTP 200**, o iframe ficou sem `sandbox` e recebeu `referrerPolicy="no-referrer"`; o documento externo e a página interna responderam **HTTP 200** e o frame filho criou um elemento de vídeo. O canal temporário foi excluído ao terminar.

Na verificação posterior da rota atual `/canais/globo-mg`, o CanalMix e os documentos `/globomg` e `/__play/globomg` responderam **HTTP 200**, com `sandbox` ausente e `referrerPolicy="no-referrer"`. Nesse carregamento não apareceu um elemento de vídeo em 12 segundos. Outra tentativa repetida recebeu **HTTP 522** do host. O 403 causado pelo `Referer` local foi removido; o provedor teve respostas variáveis durante as verificações.

**Resultado:** o bloqueio era causado pelo `Referer` local enviado ao provedor, não pelo sandbox. A regra por hostname para `v1.rdembed.lat` agora usa `no-referrer`; o teste anterior que alterou apenas o sandbox não resolvia esse bloqueio. A política atual também omite o sandbox de todos os embeds HTTPS, inclusive os canais futuros.

## Política por provedor

As decisões ficam em `src/lib/embed-provider-policy.server.ts`. Por padrão, todos os embeds HTTPS são renderizados sem o atributo `sandbox`. As políticas de `Referer` podem ser configuradas por hostname; apenas `v1.rdembed.lat` usa `no-referrer`, e os demais hosts mantêm `strict-origin-when-cross-origin`.
