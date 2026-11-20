# CanalMix

Catálogo gratuito de canais da internet, com site público, Modo TV e painel de administração. O desenvolvimento pode usar o Supabase local; a produção pode usar um projeto Supabase hospedado.

## Requisitos no Windows

- Node.js 20.9 ou superior e npm.
- Docker Desktop iniciado.
- Aproximadamente 7 GB de memória disponíveis para o stack local do Supabase.

## Instalação local

Abra o PowerShell nesta pasta e execute:

~~~powershell
npm ci
docker network create --driver bridge --opt "com.docker.network.bridge.host_binding_ipv4=127.0.0.1" canal-mix-local
Copy-Item .env.example .env.local
npm run supabase:start
npm run supabase:env
~~~

Na primeira inicialização, o Docker baixa as imagens do Supabase. Depois disso, o banco, o login e o Studio rodam na máquina local, em uma rede Docker própria. O Next.js escuta em 127.0.0.1. No desenvolvimento, o app aceita o Supabase local; em produção, aceita somente URLs HTTPS no domínio `*.supabase.co`. O fluxo local não vincula um projeto hospedado.

Observação deste Windows: o Docker Desktop reporta as portas locais do Supabase (55621–55624) como publicadas em todas as interfaces, mesmo com a rede Docker configurada para loopback. O Next.js continua restrito a 127.0.0.1 e nada foi publicado na internet, mas não considere essas portas do Docker isoladas da rede local. Pare o Supabase com `npm run supabase:stop` quando não estiver usando o projeto em uma rede não confiável.

O comando de configuração cria ou atualiza `.env.local` com o endereço, a chave pública e a chave `SUPABASE_SERVICE_ROLE_KEY` do stack local. Essa última chave fica somente no servidor e nunca é enviada ao navegador:

~~~powershell
Get-Content .env.local | Where-Object { $_ -match '^NEXT_PUBLIC_' }
~~~

O arquivo é ignorado pelo Git. O app aceita apenas endereços locais durante o desenvolvimento e URLs HTTPS do Supabase hospedado em produção. A chave `publishable` é pública e pode ser enviada ao navegador; nunca use a chave `service_role` em variáveis `NEXT_PUBLIC_`.

## Criar o primeiro administrador

Não existe cadastro público. Com o Supabase local iniciado, execute:

~~~powershell
npm run admin:provision
~~~

Esse comando é apenas para o Supabase local. Ele pede e-mail e senha, cria a conta pelo endpoint administrativo local e registra a permissão na tabela `catalog_admins`. Ele confere que a API é local antes de usar a chave privilegiada.

Para um Supabase hospedado, crie a conta em **Authentication → Users** no Dashboard. Depois, copie o UUID do usuário e adicione a permissão pelo SQL Editor:

~~~sql
insert into public.catalog_admins (user_id)
values ('<UUID do usuário>')
on conflict (user_id) do nothing;
~~~

Entre em http://127.0.0.1:3000/admin/login e gerencie os canais em http://127.0.0.1:3000/admin/canais.

## Iniciar o CanalMix

~~~powershell
npm run dev
~~~

- Site público: http://127.0.0.1:3000
- Modo TV: http://127.0.0.1:3000/tv
- Login administrativo: http://127.0.0.1:3000/admin/login
- Painel de canais: http://127.0.0.1:3000/admin/canais
- Supabase Studio local: http://127.0.0.1:55623

O banco começa sem canais fictícios. As sete categorias são criadas pela migration. Use URLs HTTPS de incorporação permitidas pelo provedor; cada provedor decide se permite reprodução em iframe. O player mantém uma mensagem de indisponibilidade e o link oficial, se cadastrado.

Cada canal aceita várias URLs HTTPS de embed. Elas ficam ordenadas como Opção 1, Opção 2 e assim por diante; o visitante pode alternar entre elas no player, e o administrador pode testar, adicionar ou remover opções no formulário.

## Desenvolvimento e testes

~~~powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
~~~

Os testes de ponta a ponta precisam do Docker, do Supabase local e do .env.local configurado. Eles criam contas e canais temporários marcados como TESTE e usam endereços reservados em .test; os registros são removidos ao final. npm test executa os testes unitários e os testes de ponta a ponta.

Para reaplicar a migration e zerar somente o banco local:

~~~powershell
npm run supabase:reset
~~~

Para parar os serviços locais:

~~~powershell
npm run supabase:stop
~~~

## Publicar na Vercel

No projeto Vercel, configure estas variáveis de ambiente para Production (e também para Preview se quiser testar previews):

~~~text
NEXT_PUBLIC_SUPABASE_URL=https://cyymtfofyhgcsoxefetn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave publicável do projeto>
~~~

Para registrar visitantes na tela **Usuários online**, configure também `SUPABASE_SERVICE_ROLE_KEY` em Production e Preview. Essa chave é usada somente pelo endpoint de heartbeat no servidor; nunca use o prefixo `NEXT_PUBLIC_`.

As variáveis `NEXT_PUBLIC_` são incorporadas ao bundle durante o build. Defina-as antes de iniciar ou repetir o deploy. Use somente a chave publicável; a chave `service_role` não deve ser colocada na Vercel como variável `NEXT_PUBLIC_` nem no código do site.

Antes de aplicar migrations, confira no projeto Supabase se o esquema e o histórico já existem. Se o projeto estiver vazio, vincule o CLI ao projeto e aplique as migrations com o CLI atual:

~~~powershell
npx supabase login
npx supabase link --project-ref cyymtfofyhgcsoxefetn
npx supabase migration list --remote
npx supabase db push --remote
~~~

Se o projeto já tiver mudanças feitas diretamente no Dashboard, capture e revise o esquema remoto antes de aplicar migrations. Confirme o destino e as migrations antes de aceitar o `db push`; não use `db reset` no projeto hospedado. Depois de configurar as variáveis da Vercel e as migrations do Supabase, um push à branch de produção do GitHub inicia o deploy conectado.

## Interface e acessibilidade

O site usa a paleta CanalMix e as fontes Manrope e Inter instaladas no próprio projeto. Categorias e canais são ordenados em português do Brasil. Imagens preservam a proporção 16:9 e são exibidas por inteiro. No Modo TV, as setas movem o foco, Enter abre o cartão, Escape volta às categorias e Voltar ao catálogo devolve o foco ao canal.

Antes de usar em um televisor real, confira os itens de docs/checklist-tv-real.md. Os controles dentro do iframe variam conforme o navegador da TV e o provedor do player.
