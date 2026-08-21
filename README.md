# MoveControl

Aplicação web responsiva (mobile-first) para gerir e rastrear a movimentação de
equipamentos entre datacenters através do scan de QR Codes.

## Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de dados**: Prisma ORM + SQLite (dev) — troca fácil para PostgreSQL em produção
- **Scanner QR**: [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) (câmara do telemóvel, no browser)
- **Geração de QR**: [`react-qr-code`](https://github.com/rosskhanas/react-qr-code) + [`qrcode`](https://github.com/soldair/node-qrcode) (export PNG)

## Modelo de dados (`prisma/schema.prisma`)

- **Equipment** — o `hostname` é o **ID Único** codificado no QR Code.
- **Checkpoint** — pontos de controlo, ordenados por `order` (o valor mais alto = "Concluído").
- **User** — utilizadores selecionáveis como responsáveis pelo scan.
- **ScanEvent** — liga Equipment + Checkpoint + User + `timestamp`; é a fonte de verdade do histórico/timeline e da localização atual (último scan de cada equipamento).

## Estrutura do projeto

```
prisma/
  schema.prisma        # esquema da base de dados
  seed.ts               # checkpoints, utilizadores e equipamentos de exemplo
src/
  app/
    page.tsx                        # Dashboard (stats + tabela + filtros)
    equipment/page.tsx              # Registo + listagem de equipamentos
    equipment/[hostname]/page.tsx   # Detalhe + timeline + QR code
    equipment/[hostname]/print/page.tsx  # Vista de impressão (etiqueta única / folha ×8)
    checkpoints/page.tsx            # Gestão de checkpoints
    users/page.tsx                  # Gestão de utilizadores
    scan/page.tsx                   # Módulo de scan mobile (câmara)
    api/
      equipment/…, checkpoints/…, users/…, scans/…, stats/…
  components/
    QRScanner.tsx        # wrapper de html5-qrcode
    QRCodeDisplay.tsx    # QR code + download PNG
    PrintView.tsx        # layout de impressão
    EquipmentTable.tsx, DashboardClient.tsx, StatsCards.tsx, MovementTimeline.tsx, StatusBadge.tsx, Navbar.tsx
  lib/
    prisma.ts, types.ts, utils.ts, serialize.ts
```

## Como correr localmente

```bash
npm install
npx prisma migrate dev --name init   # cria a BD SQLite e corre o seed automaticamente
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Testado com `npm run build` (build de
produção limpo) e verificado no browser: dashboard, registo de equipamentos, geração/impressão
de QR codes e o endpoint `POST /api/scans` (fluxo completo de scan).

> Nota: neste ambiente de geração o registo `registry.npmjs.org` estava a bloquear a ligação
> (reset de TLS); a instalação foi feita com sucesso via `npm install --registry https://registry.yarnpkg.com`
> (mirror oficial). No teu computador, `npm install` normal deve funcionar sem qualquer alteração.

### Produção com PostgreSQL

1. Muda `provider = "sqlite"` para `provider = "postgresql"` em `prisma/schema.prisma`.
2. Define `DATABASE_URL` para a tua connection string Postgres.
3. `npx prisma migrate deploy`.

## Fluxo de utilização

1. **Checkpoints** — confirma/ajusta os pontos de controlo (já vêm 4 pré-configurados).
2. **Equipamentos** — regista cada equipamento pelo Nome/Hostname (ID Único).
3. Abre o **Detalhe** do equipamento → **Abrir Vista de Impressão** → imprime a etiqueta (A4
   único ou folha com 8 etiquetas) e cola-a no equipamento.
4. No telemóvel, abre **Scan**, seleciona o checkpoint atual e o utilizador responsável,
   ativa a câmara e aponta ao QR code — cada leitura regista automaticamente
   máquina + checkpoint + utilizador + timestamp.
5. O **Dashboard** mostra em tempo (quase) real a localização atual de cada máquina, o
   progresso global (% concluído / em trânsito / pendente) e permite filtrar por
   checkpoint, estado ou pesquisar por nome.
