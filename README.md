# MoveControl

Aplicação web responsiva (mobile-first) para gerir e rastrear a movimentação de
equipamentos entre datacenters através do scan de QR Codes.

## Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes
- **Autenticação**: [Auth.js / NextAuth v5](https://authjs.dev) (Credentials + JWT) com RBAC (3 roles)
- **Base de dados**: Prisma ORM + SQLite (dev) — troca fácil para PostgreSQL em produção
- **Scanner QR**: [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) (câmara do telemóvel, no browser)
- **Geração de QR**: [`react-qr-code`](https://github.com/rosskhanas/react-qr-code) + [`qrcode`](https://github.com/soldair/node-qrcode) (export PNG)

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

```bash
npm install
npx prisma migrate dev --name init   # cria a BD SQLite e corre o seed automaticamente
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — vais ser redirecionado para `/login`.
Usa uma das [credenciais de exemplo](#credenciais-de-exemplo-criadas-pelo-seed) acima.

Testado com `npm run build` (build de produção limpo) e verificado no browser: login/logout,
as 3 roles (incluindo bloqueio de `/users` e de checkpoints não autorizados para Validador,
testado também via chamada direta à API), dashboard, registo de equipamentos, geração/impressão
de QR codes e o fluxo completo de scan.

> Nota: neste ambiente de geração o registo `registry.npmjs.org` estava a bloquear a ligação
> (reset de TLS); a instalação foi feita com sucesso via `npm install --registry https://registry.yarnpkg.com`
> (mirror oficial). No teu computador, `npm install` normal deve funcionar sem qualquer alteração.

### Produção com PostgreSQL

1. Muda `provider = "sqlite"` para `provider = "postgresql"` em `prisma/schema.prisma`.
2. Define `DATABASE_URL` para a tua connection string Postgres.
3. `npx prisma migrate deploy`.
4. Define um `AUTH_SECRET` próprio (não uses o do `.env.example`/dev).

## Fluxo de utilização

1. **Login** — entra com a tua conta (ADMIN cria contas novas em **Utilizadores**).
2. **Checkpoints** — confirma/ajusta os pontos de controlo (já vêm 4 pré-configurados;
   criar/editar/eliminar é reservado a ADMIN/CONTROLLER).
3. **Equipamentos** — regista cada equipamento pelo Nome/Hostname (ID Único) — ADMIN/CONTROLLER.
4. Abre o **Detalhe** do equipamento → **Abrir Vista de Impressão** → imprime a etiqueta (A4
   único ou folha com 8 etiquetas) e cola-a no equipamento.
5. No telemóvel, abre **Scan** — o utilizador responsável é sempre a tua conta autenticada; um
   Validador só vê os checkpoints que lhe foram associados. Ativa a câmara e aponta ao QR code —
   cada leitura regista automaticamente máquina + checkpoint + utilizador + timestamp.
6. O **Dashboard** mostra em tempo (quase) real a localização atual de cada máquina, o
   progresso global (% concluído / em trânsito / pendente) e permite filtrar por
   checkpoint, estado ou pesquisar por nome.
