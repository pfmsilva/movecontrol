# MoveControl

Aplicação web responsiva (mobile-first) para gerir e rastrear a movimentação de
equipamentos entre datacenters através do scan de QR Codes.

## Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes
- **Autenticação**: [Auth.js / NextAuth v5](https://authjs.dev) (Credentials + JWT) com RBAC (3 roles)
- **Base de dados**: Prisma ORM + PostgreSQL (mesma BD em dev e produção — ver [Deploy no Vercel](#deploy-no-vercel))
- **Scanner QR**: [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) (câmara do telemóvel, no browser)
- **Geração de QR**: [`react-qr-code`](https://github.com/rosskhanas/react-qr-code) + [`qrcode`](https://github.com/soldair/node-qrcode) (export PNG)
- **Excel**: [`exceljs`](https://github.com/exceljs/exceljs) (exportação/importação de equipamentos)

## Autenticação e Roles

Todas as páginas (exceto `/login`) exigem sessão autenticada — reforçado no `src/middleware.ts`.
Existem 3 roles:

| Role | Utilizadores | Checkpoints | Equipamentos | Scans |
|---|---|---|---|---|
| **ADMIN** (Administrador) | Controlo total (criar/editar/eliminar, atribuir roles e checkpoints) | Controlo total | Controlo total | Qualquer checkpoint |
| **CONTROLLER** (Controlador Total) | Sem acesso | Criar/editar/eliminar | Criar/editar/eliminar | Qualquer checkpoint |
| **VALIDATOR** (Validador) | Sem acesso | Só visualiza | Só visualiza | **Só os checkpoints que lhe estão associados** |

A restrição do Validador é validada **sempre no servidor** (`/api/scans`, consultando a BD a cada
scan), nunca só na interface — mesmo que o token de sessão esteja desatualizado.

### Credenciais de exemplo (criadas pelo seed)

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@movecontrol.local` | `Admin123!` |
| CONTROLLER | `controlador@movecontrol.local` | `Controlador123!` |
| VALIDATOR | `validador.origem@movecontrol.local` (checkpoints 1–2) | `Validador123!` |
| VALIDATOR | `validador.destino@movecontrol.local` (checkpoints 3–4) | `Validador123!` |

⚠️ **Muda estas passwords (ou apaga estas contas) antes de ires para produção.** Gere um
`AUTH_SECRET` novo com `openssl rand -base64 33` e define-o no `.env`.

Novos utilizadores, roles e checkpoints associados a Validadores geram-se em **Utilizadores**
(menu só visível/acessível a ADMIN).

## Modelo de dados (`prisma/schema.prisma`)

- **Equipment** — o `hostname` é o **ID Único** codificado no QR Code.
- **Checkpoint** — pontos de controlo, ordenados por `order` (o valor mais alto = "Concluído").
- **User** — conta autenticada (`email` + `passwordHash` + `role`); é também o responsável pelo scan.
  Um `VALIDATOR` tem uma relação N-N (`validatorCheckpoints`) com os checkpoints que pode assumir.
- **ScanEvent** — liga Equipment + Checkpoint + User + `timestamp`; é a fonte de verdade do histórico/timeline e da localização atual (último scan de cada equipamento).

## Estrutura do projeto

```
prisma/
  schema.prisma        # esquema da base de dados (inclui Role, User com auth)
  seed.ts               # checkpoints, utilizadores (1 por role) e equipamentos de exemplo
src/
  auth.ts                # configuração completa do Auth.js (Credentials provider, Prisma)
  auth.config.ts          # configuração "leve" partilhada com o middleware (Edge-safe)
  middleware.ts           # protege todas as páginas; bloqueia /users a não-ADMIN
  app/
    login/page.tsx                  # página de login (server action)
    page.tsx                        # Dashboard (stats + tabela + filtros)
    equipment/page.tsx              # Registo + listagem de equipamentos
    equipment/[hostname]/page.tsx   # Detalhe + timeline + QR code
    equipment/[hostname]/print/page.tsx  # Vista de impressão (etiqueta única / folha ×8)
    checkpoints/page.tsx            # Gestão de checkpoints
    users/page.tsx                  # Gestão de utilizadores, roles e checkpoints (ADMIN)
    scan/page.tsx                   # Módulo de scan mobile (câmara)
    api/
      auth/[...nextauth]/…, equipment/…, checkpoints/…, users/…, scans/…, stats/…
  components/
    QRScanner.tsx        # wrapper de html5-qrcode
    QRCodeDisplay.tsx    # QR code + download PNG
    PrintView.tsx        # layout de impressão
    Providers.tsx        # SessionProvider (next-auth/react)
    EquipmentTable.tsx, DashboardClient.tsx, StatsCards.tsx, MovementTimeline.tsx, StatusBadge.tsx, Navbar.tsx
  lib/
    prisma.ts, types.ts, utils.ts, serialize.ts, permissions.ts, password.ts
  types/
    next-auth.d.ts       # augmentation de tipos (role, validatorCheckpointIds na sessão)
```

## Como correr localmente

Precisas de uma base de dados Postgres (local ou na cloud — [Neon](https://neon.tech) e
[Supabase](https://supabase.com) têm planos gratuitos e connection string pronta em ~2 minutos).

```bash
npm install
cp .env.example .env   # depois edita DATABASE_URL e AUTH_SECRET no .env
npx prisma migrate deploy   # aplica o schema à tua BD Postgres
npm run seed                # opcional: checkpoints + 1 utilizador por role + equipamentos de exemplo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — vais ser redirecionado para `/login`.
Usa uma das [credenciais de exemplo](#credenciais-de-exemplo-criadas-pelo-seed) acima (se correste o seed).

Testado com `npx next build` (build de produção limpo) e verificado no browser: login/logout,
as 3 roles (incluindo bloqueio de `/users` e de checkpoints não autorizados para Validador,
testado também via chamada direta à API), dashboard, registo de equipamentos, geração/impressão
de QR codes e o fluxo completo de scan. A migração inicial para Postgres foi gerada com
`prisma migrate diff --from-empty` (não precisa de ligação à BD) — não foi corrida contra uma
instância Postgres real neste ambiente de geração, por não haver nenhuma disponível; corre
`prisma migrate deploy` como primeiro passo para a aplicares e confirmares.

> Nota: neste ambiente de geração o registo `registry.npmjs.org` estava a bloquear a ligação
> (reset de TLS); a instalação foi feita com sucesso via `npm install --registry https://registry.yarnpkg.com`
> (mirror oficial). No teu computador, `npm install` normal deve funcionar sem qualquer alteração.

## Deploy no Vercel

O erro `There was a problem with the server configuration` no Vercel acontece por faltarem
variáveis de ambiente/BD — segue estes passos:

1. **Cria a base de dados** — no dashboard do Vercel, abre o projeto → separador **Storage** →
   **Create Database** → escolhe **Postgres** (Neon) no marketplace. Isto associa
   automaticamente a connection string ao projeto como variável de ambiente (normalmente
   `DATABASE_URL`, ou `POSTGRES_URL`/`DATABASE_URL_UNPOOLED` consoante a integração — confirma o
   nome exato em **Settings → Environment Variables** e garante que existe uma `DATABASE_URL`
   com esse valor, para todos os ambientes: Production, Preview e Development).
2. **Define o `AUTH_SECRET`** — em **Settings → Environment Variables**, adiciona `AUTH_SECRET`
   com um valor gerado por `openssl rand -base64 33` (um segredo diferente do usado em dev).
3. **Redeploy** — o script `build` (`prisma migrate deploy && next build`) aplica o schema à BD
   automaticamente em cada deploy, por isso não precisas de correr migrações manualmente.
4. **Cria o primeiro utilizador** — uma BD nova fica sem nenhum utilizador, e sem um ADMIN
   ninguém consegue entrar nem criar contas pela app (problema do ovo e da galinha). Depois do
   primeiro deploy com sucesso, corre o seed **localmente, apontado à BD de produção** (copia a
   `DATABASE_URL` do Vercel para o teu `.env` local só para este passo):
   ```bash
   npm run seed
   ```
   Isto cria os 4 checkpoints, um utilizador por role (credenciais de exemplo acima) e os
   equipamentos de demonstração — o comando é idempotente (`upsert`), podes correr de novo sem
   duplicar dados. Muda a password do ADMIN (ou apaga as contas de exemplo) assim que entrares.

Se o erro persistir depois disto, confirma nos **Logs** do Vercel (separador Deployments → o
deployment → Runtime Logs) qual é o erro real — o Auth.js só mostra esta mensagem genérica ao
utilizador, mas regista a causa exata nos logs do servidor.

## Fluxo de utilização

1. **Login** — entra com a tua conta (ADMIN cria contas novas em **Utilizadores**).
2. **Checkpoints** — confirma/ajusta os pontos de controlo (já vêm 4 pré-configurados;
   criar/editar/eliminar é reservado a ADMIN/CONTROLLER).
3. **Equipamentos** — regista cada equipamento pelo Nome/Hostname (ID Único) — ADMIN/CONTROLLER.
   Também podes:
   - **Exportar Excel** — descarrega todos os equipamentos e todos os campos (incluindo estado,
     checkpoint atual, responsável e datas) — disponível para qualquer role autenticado.
   - **Modelo de Importação** — descarrega um `.xlsx` com o cabeçalho certo e uma linha de
     exemplo pré-preenchida (ADMIN/CONTROLLER).
   - **Importar Excel** — carrega um `.xlsx` (o template ou o resultado de uma exportação
     anterior) para criar/atualizar equipamentos em massa pelo `Hostname`; células em branco
     mantêm o valor já existente em vez de o apagar. No fim mostra quantos foram criados,
     quantos atualizados, e o detalhe de qualquer linha com erro (ADMIN/CONTROLLER).
4. Abre o **Detalhe** do equipamento → **Abrir Vista de Impressão** → imprime a etiqueta (A4
   único ou folha com 8 etiquetas) e cola-a no equipamento.
5. No telemóvel, abre **Scan** — o utilizador responsável é sempre a tua conta autenticada; um
   Validador só vê os checkpoints que lhe foram associados. Ativa a câmara e aponta ao QR code;
   a app procura o equipamento e pede confirmação (mostra estado atual → novo checkpoint) antes
   de gravar seja o que for — só depois de confirmares é que o scan fica registado.
6. O **Dashboard** mostra em tempo (quase) real a localização atual de cada máquina, o
   progresso global (% concluído / em trânsito / pendente) e permite filtrar por
   checkpoint, estado ou pesquisar por nome.
