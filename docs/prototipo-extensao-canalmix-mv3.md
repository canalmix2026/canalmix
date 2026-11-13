# Protótipo de proteção do CanalMix para Chrome

**Data do teste:** 12 nov. 2026  
**Manifest:** V3  
**Pasta carregável:** `extension/canalmix-protection/`

## Escopo

A extensão ativa regras `declarativeNetRequest` por aba. Os padrões de permissão limitam a execução a `http://127.0.0.1:3000/*` e `http://localhost:3000/*`; cada regra inclui apenas os `tabIds` das abas CanalMix com proteção ativa e só corresponde a pedidos iniciados pelo embed `ww0.embedtv.cc`.

As regras visam três destinos observados na rede da Opção 1 do Globo DF:

| Destino observado | Tipo visto no navegador | Regra |
| --- | --- | ---: |
| `llvpn.com/tag.min.js` | script | 101 |
| `my.rtmark.net/gid.js` | XMLHttpRequest | 102 |
| `luugy.com/5/11789690/` | XMLHttpRequest | 103 |

Os hosts do iframe e da transmissão ficam fora da lista. O teste de correspondência confirmou que as regras não se aplicam a outra aba, ao documento de `ww0.embedtv.cc` ou ao host da transmissão. O iframe do canal continuou sem o atributo `sandbox`; nenhum código do player do site foi alterado.

## Comparação

As três condições usaram a mesma rota, o mesmo canal e a mesma opção: `http://127.0.0.1:3000/canais/globo-df`, **Globo DF, Opção 1**, embed `https://ww0.embedtv.cc/globodf`. O clique foi no botão **Assistir** dentro do player. O vídeo contou como reproduzido quando o elemento de vídeo avançou o tempo e ficou em estado de reprodução.

| Condição | Vídeo tocou? | Abriu outra aba ao clicar Play? | Redirecionou a página? | Rede observada |
| --- | --- | --- | --- | --- |
| Sem extensão | Sim | Não | Não | Os três destinos da tabela foram solicitados. |
| AdBlock 6.53.0 | Sim | Não | Não | Os três destinos também foram solicitados. |
| Proteção CanalMix | Sim | Não | Não | `llvpn.com/tag.min.js` falhou com `net::ERR_BLOCKED_BY_CLIENT`. `testMatchOutcome` confirmou que as regras 101–103 correspondem aos três pedidos; os dois XHR não apareceram no log de rede dessa execução. |

O teste DNR retornou zero correspondências para uma aba diferente, o iframe do player e o host da transmissão. O botão do popup também foi exercitado: **Desativar proteção** removeu as três regras da aba e **Ativar proteção** restaurou as três.

O comparativo rodou no Chromium 158 incluído pelo Playwright, em perfis temporários. Para AdBlock foi carregada a cópia local da versão 6.53.0 instalada no Chrome, com um perfil temporário limpo; as preferências e listas pessoais do perfil principal não foram copiadas. Portanto, esse resultado mede a versão instalada com configuração limpa, não as exceções pessoais do perfil do Chrome.

Nenhum destino de propaganda abriu como navegação de primeiro plano durante o clique. Por isso, o protótipo não inclui uma regra ampla de redirecionamento ou de bloqueio de `main_frame`: bloqueia somente os três pedidos observados. O teste não comprova que esses embeds nunca abrirão um pop-up em outras sessões.

## Instalar em `chrome://extensions`

1. Inicie o CanalMix local em `http://127.0.0.1:3000` ou `http://localhost:3000`.
2. Abra `chrome://extensions` em uma aba do Chrome.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e escolha a pasta `extension/canalmix-protection` do repositório.
5. Abra ou recarregue uma página de canal do CanalMix.
6. Clique no ícone da extensão para pausar ou ativar a proteção naquela aba. Se o ícone não estiver fixado na barra, abra o menu de extensões e fixe-o.

Este protótipo só corresponde às origens locais na porta 3000. Para outro domínio ou porta, atualize os padrões do `manifest.json` e a validação de origem em `service-worker.js` e `content-script.js`.

Referências: [API declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest/), [padrões de URL do Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns) e [carregar uma extensão sem compactação](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).
