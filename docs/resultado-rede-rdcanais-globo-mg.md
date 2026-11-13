# Verificação da Opção 2 do canal Globo MG

**Data:** 9 de novembro de 2026  
**CanalMix local:** `http://127.0.0.1:3000/canais/globo-mg`  
**URL selecionada:** `https://rdcanais.org/globomg`  
**Ambiente:** Chromium via Playwright; captura de respostas da aba Rede.

## Resultado

Com o sandbox padrão, `rdcanais.org` respondeu HTTP 200 e mostrou a mensagem do próprio embed de que o sandbox bloqueava o player e precisava ser removido. Depois de remover o atributo, o documento do embed continuou respondendo HTTP 200 e essa mensagem desapareceu.

O player ainda não iniciou nesta verificação. A API de sessão de vídeo da Globo respondeu **HTTP 401** em `https://playback.video.globo.com/v5/video-session`, com o corpo `{"code":"login-required","reason":""}`. O documento também não criou elemento `<video>`. A mesma resposta `401 login-required` ocorreu abrindo a URL do provedor diretamente em uma aba, fora do CanalMix. Portanto, o bloqueio de iframe foi corrigido, mas a origem não autorizou a sessão de reprodução.

A Opção 1, `https://v1.rdembed.lat/globomg`, respondeu **HTTP 403** durante a mesma navegação. A captura anterior também retornou 403 sem sandbox. A política atual omite o sandbox para todos os embeds HTTPS.

## Exceção aplicada

`src/lib/embed-provider-policy.server.ts` omite o atributo para todos os embeds HTTPS, incluindo `rdcanais.org`, `v1.rdembed.lat` e canais adicionados futuramente. A regra também vale para a prévia administrativa; os testes cobrem site, Modo TV e prévia.

**Conclusão:** o erro que dizia que o sandbox bloqueava o player foi removido. Não foi possível iniciar a transmissão porque a API do provedor retornou `login-required`; será necessário que o provedor libere uma sessão autorizada para esse embed.
