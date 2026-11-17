# Atualizar grade de jogos da semana

Use esta rotina quando o usuário pedir **“Atualize a grade de jogos da semana do CanalMix”**. Execute pesquisa, cadastro, vínculos e conferência. O padrão é hoje e os seis dias seguintes, no fuso `America/Sao_Paulo`; quando o usuário informar datas, use o intervalo solicitado.

## 1. Pesquisar partidas e transmissões

- Consulte os próximos sete dias, incluindo hoje. Use horário de Brasília para toda data exibida e para ordenar as partidas.
- Selecione jogos relevantes de clubes e seleções, masculinos e femininos, com transmissão anunciada ao público brasileiro. Inclua competições estrangeiras quando houver anúncio de transmissão no Brasil.
- Confirme confronto, competição, data e horário no calendário oficial da competição ou da federação. Para torneios nacionais, prefira CBF e federações; para torneios internacionais, prefira UEFA, FIFA, CONMEBOL ou a entidade organizadora.
- Confirme a transmissão na programação oficial da emissora ou plataforma. Use guias editoriais brasileiros como apoio quando a grade oficial não detalhar o evento. Não deduza uma transmissão apenas pelos direitos gerais da competição.
- Guarde as URLs consultadas junto aos dados da partida e da transmissão para conferência administrativa. Se fontes diferentes confirmarem calendário e transmissão, registre ambas.
- Registre o canal exato anunciado. Trate `SporTV`, `SporTV 2`, `SporTV 3`, `Premiere 1` e `Premiere 2` como canais diferentes. Se a fonte disser somente `Premiere`, grave `Premiere — canal a confirmar` sem `channel_id`. Não adivinhe o subcanal.
- Registre emissoras e plataformas anunciadas para o público brasileiro. Vincule apenas emissoras/canais brasileiros; serviços de streaming sem canal correspondente ficam como texto.

## 2. Cadastrar e vincular

- Reutilize o cadastro de partidas, as ações administrativas e o catálogo de times e canais já existentes. Não crie um fluxo paralelo sem necessidade.
- Antes de cadastrar a partida, procure cada participante em **Administração > Times** por nome, país, tipo e gênero. Se um clube ou uma seleção estiver ausente, cadastre-o nessa área antes de vincular a partida. Para seleções, use `national_team`, gênero correto, país e nome oficial/localizado; não use um clube de nome parecido como substituto.
- Crie cada time ausente de forma idempotente e preserve os registros existentes. Vincule um escudo oficial ou licenciado somente quando a origem estiver confirmada; sem escudo aprovado, mantenha `shield_url` vazio e o estado pendente para usar o ícone padrão.
- Antes de inserir, procure a partida pelo ID externo da competição, se existir. Sem ID, procure pela competição e pelo confronto mandante–visitante. Atualize a partida correspondente quando a data ou o horário mudar; evite duplicatas.
- No cadastro administrativo, preencha juntos o provedor e o ID externo da partida quando a fonte fornecer um identificador; salve cada URL HTTPS de confirmação em uma linha do campo de fontes para revisão no painel.
- Preserve IDs existentes, correções manuais e escudos já associados. Não substitua um valor corrigido manualmente por um valor de uma fonte secundária. Quando a fonte oficial contrariar uma correção, registre a divergência para revisão.
- Associe cada transmissão ao ID exato do canal brasileiro no catálogo. Use somente o canal correto, publicado e com pelo menos uma fonte ativa. Não associe por semelhança de nome. Se a emissora estiver confirmada e não houver canal correspondente, salve o nome como texto, sem vínculo.
- Reutilize escudos oficiais ou licenciados já cadastrados. Ao associar um escudo novo, use o ID do time na fonte de dados quando disponível e registre a origem e a licença. Se não houver escudo aprovado, deixe o vínculo vazio para o ícone padrão; mantenha o nome do time.
- Publique as partidas que devem aparecer na grade pública depois de revisar confronto, horário, competição, escudos e transmissões.

## 3. Conferir grade pública e Modo TV

- Abra a grade pública e confira que as partidas aparecem em lista, agrupadas por data de Brasília e ordenadas pelo horário. Cada linha deve mostrar os dois times com seus escudos, o horário e a competição; não deve haver coluna de país.
- Quando existir um vínculo válido para um canal publicado com ao menos uma fonte ativa, a linha deve mostrar um único botão `Assistir no [nome do canal]`. Use primeiro o vínculo marcado como principal; sem principal, use o primeiro vínculo válido na ordem cadastrada.
- Sem vínculo válido, mostre as emissoras brasileiras anunciadas apenas como texto. Para `Premiere` sem subcanal confirmado, use exatamente `Premiere — canal a confirmar` e não mostre botão de canal.
- Repita a conferência no Modo TV. O mesmo critério de botão e texto deve valer nos dois modos.
- Se qualquer requisito visual falhar, corrija a implementação antes de concluir a rotina e confira novamente a grade pública e o Modo TV.

## 4. Retenção das partidas

- Mantenha cada partida publicada na grade até completar três horas do seu horário de início, inclusive enquanto estiver em andamento.
- Após três horas, exclua a partida do catálogo nos Supabase local e público. A exclusão deve remover as transmissões vinculadas por cascata e não criar nem manter histórico.
- A limpeza automática roda a cada minuto; a grade também oculta partidas vencidas quando o limite de três horas é atingido.

## 5. Executar e validar no ambiente local

- Para gravar, confirme primeiro o Supabase local com `npm exec -- supabase status --network-id canal-mix-local --output json`. Verifique que `linked_project` é `null` e que `API_URL` ou o host do banco usa loopback (`127.0.0.1`, `localhost` ou `::1`). Pare se qualquer condição falhar.
- Consulte o estado atual da grade e do catálogo para evitar duplicatas e para reutilizar os IDs dos times e canais. Use o fluxo de cadastro/importação atual do projeto.
- Atualize sempre o Supabase local e o site público. No público, confirme o projeto `canalmix2026` (`cyymtfofyhgcsoxefetn`) pela conta conectada antes de gravar; não use um destino remoto implícito do CLI. Faça upsert idempotente e acrescente somente partidas, times e transmissões que faltam.
- Não use `supabase db reset` para importar jogos. Se a mudança for somente de dados, publique os dados no Supabase; só faça deploy de código quando a implementação do site também tiver mudado.
- Confira os dados salvos e a grade renderizada local e pública, incluindo o Modo TV. Repita a importação dos mesmos dados nos dois ambientes e confirme que não houve duplicações.
- No resumo, informe o período consultado, quantas partidas foram adicionadas e atualizadas em cada ambiente, e liste times sem escudo, jogos sem vínculo de canal ou com `Premiere — canal a confirmar`. Inclua as fontes usadas para permitir conferência posterior.
