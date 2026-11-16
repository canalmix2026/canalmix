# Catálogo de times — importação local

O snapshot `openfootball-teams-2026-11-15.json` registra clubes verificados em resultados de competições nacionais de 72 países, separados por país, tipo, gênero e equipe principal/reserva/formação. Foram escolhidas as temporadas disponíveis mais recentes a partir de 2024 e priorizadas as principais divisões; quando o repositório documenta divisões inferiores, elas também entram no lote. O snapshot registra os commits exatos, caminhos de origem, temporadas e contagem por país.

## Fontes e licenças

- OpenFootball: repositórios de ligas e calendários selecionados para o snapshot; os arquivos de dados têm licença CC0-1.0. O repositório de clubes é usado para nomes e aliases, sem importar seus escudos. Consulte os metadados `repositories` no snapshot para URLs e commits.
- New Zealand Football: lista oficial dos participantes masculinos e femininos de 2026, referenciada individualmente nos registros do país.
- OFC: participantes da Champions League masculina de 2026, com a página oficial indicada nos registros correspondentes.
- Escudos: a licença de dados não concede licença para marcas/logotipos. Nenhum arquivo de escudo foi aprovado sem confirmação individual de origem e licença; por isso, as entradas importadas ficam com `shield_status=pending` e a interface usa o ícone neutro.

## Importação retomável

Gere ou atualize o snapshot com `node scripts/build-team-catalog-snapshot.mjs`. Antes de gravar, confirme que o Supabase ativo é local e não está vinculado a projeto remoto; o importador faz essa verificação novamente e bloqueia hosts que não sejam loopback. Em seguida rode `npm run teams:import-local -- --dry-run` e `npm run teams:import-local`. A opção `--country BRA` limita a operação a um país.

O importador usa `import_key` estável, upsert em lotes de 100 e preserva nomes manuais, aliases, escudos e referências já preenchidas. A execução mais recente é registrada em `latest-import-run.json`.

## Cobertura

O snapshot importa todos os clubes que as fontes permitiram confirmar, sem completar lacunas por estimativa. A meta de aproximadamente 200 por país só foi atingida pela Bélgica (210). Para os outros países, o arquivo traz o total, a distribuição por gênero/tipo e as temporadas cobertas; todos ficam abaixo de 200. Essa diferença representa o limite dos dados verificáveis coletados para este lote, não uma afirmação de que as ligas tenham menos equipes.
