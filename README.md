# StarTip — Non-Custodial Stellar Creator Tipping & Monetization Platform

[![Stellar](https://img.shields.io/badge/Blockchain-Stellar%20Testnet-08B5E5?logo=stellar&logoColor=white)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contract-Soroban%20Rust-orange)](https://soroban.stellar.org)
[![Stellar Wallets Kit](https://img.shields.io/badge/Wallet%20Kit-@creit.tech%2Fstellar--wallets--kit-blue)](https://stellarwalletskit.dev/)
[![Django](https://img.shields.io/badge/Backend-Django%205.1%20%7C%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20TailwindCSS-61DAFB?logo=react&logoColor=black)](http://localhost:5173)
[![Celery](https://img.shields.io/badge/Workers-Celery%20%7C%20Redis-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![OpenAPI](https://img.shields.io/badge/Docs-OpenAPI%203.0%20%28Swagger%2FReDoc%29-85EA2D?logo=openapi-initiative&logoColor=black)](http://localhost:8000/api/docs/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose%20%7C%20Dokploy-2496ED?logo=docker&logoColor=white)](https://dokploy.com)

**StarTip** is a high-performance, non-custodial tipping and creator monetization platform powered by the **Stellar Network** and **Soroban smart contracts**. It allows streamers, open-source developers, and digital creators to receive direct tips in **XLM** and **USDC** with instant (~3-5s) on-chain settlement, sub-cent transaction fees, embeddable donation widgets, and real-time livestream alerts for OBS and Streamlabs.

---

## 🔗 Quick Access Links

| Service | URL | Description |
| :--- | :--- | :--- |
| **Landing Page** | [http://localhost:5173/](http://localhost:5173/) | StarTip public homepage |
| **Creator Dashboard** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Dedicated creator metrics, widget customizer & stream alerts |
| **Interactive Demo (Split View)** | [http://localhost:5173/demo](http://localhost:5173/demo) | Dual-screen fan tip card & creator live stream preview |
| **Creator Tip Page (@tobibuilds)** | [http://localhost:5173/tobibuilds](http://localhost:5173/tobibuilds) | Public tip card for `@tobibuilds` (also accessible at `/tip/tobibuilds`) |
| **Creator Tip Page (@alex_dev)** | [http://localhost:5173/alex_dev](http://localhost:5173/alex_dev) | Public tip card for `@alex_dev` (also accessible at `/tip/alex_dev`) |
| **Backend REST API** | [http://localhost:8000](http://localhost:8000) | Django REST Framework API root |
| **Interactive OpenAPI (Swagger UI)** | [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/) | Interactive API explorer & sandbox testing |
| **ReDoc API Documentation** | [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/) | Detailed OpenAPI 3.0 specification reference |
| **Django Admin Portal** | [http://localhost:8000/admin/](http://localhost:8000/admin/) (or [https://startip.app/admin/](https://startip.app/admin/)) | Admin portal (`Startp` / `favicon.icoy3h38243@#`) |
| **OBS Livestream Alert Overlay** | [http://localhost:8000/overlay/3ecdb41a-f10e-48bf-9beb-f4dfd8373e69/](http://localhost:8000/overlay/3ecdb41a-f10e-48bf-9beb-f4dfd8373e69/) | OBS/Streamlabs browser source with real-time SSE animations |
| **Standalone Embed Widget** | [http://localhost:8000/embed/tobibuilds/](http://localhost:8000/embed/tobibuilds/) | Standalone iframe / embeddable tip widget |

---

## 🏗️ Architecture & Microservices

The application is structured into isolated, scalable services defined in [`docker-compose.yml`](file:///home/lucifer/Desktop/Startip/docker-compose.yml):

```
                                      ┌────────────────────────────────┐
                                      │   Client Browser / Streamer    │
                                      └───────┬────────────────┬───────┘
                                              │                │
                             Port 5173 (App)  │                │ Port 8000 (API & Overlays)
                                              ▼                ▼
                                    ┌────────────────┐   ┌───────────────────────────┐
                                    │    frontend    │──►│            web            │
                                    │ (React + Vite) │   │ (Django REST Framework)   │
                                    └────────────────┘   └─────────────┬─────────────┘
                                                                       │
                                      ┌────────────────────────────────┼────────────────────────────────┐
                                      │                                │                                │
                                      ▼                                ▼                                ▼
                            ┌──────────────────┐             ┌───────────────────┐            ┌───────────────────┐
                            │        db        │             │       redis       │            │  celery_worker &  │
                            │  (Postgres 16)   │             │     (Redis 7)     │            │    celery_beat    │
                            └──────────────────┘             └─────────┬─────────┘            └───────────────────┘
                                                                       │
                                                                       ▼
                                                             ┌───────────────────┐
                                                             │ soroban_indexer   │
                                                             │ (Stellar Listener)│
                                                             └───────────────────┘
```

### Services Breakdown:

1. **`frontend`** (Port `5173`):
   - React 19 + Vite + Vanilla CSS / Tailwind.
   - Integrated with the **official Stellar Wallets Kit** (`@creit.tech/stellar-wallets-kit`).
   - Supports hot-reload development mounting `./frontend:/app`.
   - Proxies backend requests (`/api`, `/overlay`, `/embed`) to `http://web:8000`.

2. **`web`** (Port `8000`):
   - Django 5.1 + Django REST Framework + Gunicorn / runserver.
   - Stellar payment request generation, XDR envelope building, and Horizon verification.
   - Server-Sent Events (SSE) live alert streaming.
   - OpenAI message safety moderation and personalized thank-you note generation.
   - Runs database migrations on startup (`RUN_MIGRATIONS=true`).

3. **`celery_worker` & `celery_beat`**:
   - Asynchronous task processing (transaction confirmations, notifications).
   - Redis task broker.

4. **`soroban_indexer`**:
   - Dedicated background daemon (`python manage.py run_soroban_event_listener`) continuously polling Stellar Soroban RPC and Horizon for contract events.

5. **`db` & `redis`**:
   - PostgreSQL 16 Alpine database with persistent volume `postgres_data`.
   - Redis 7 Alpine caching & message broker with volume `redis_data`.

---

## ⚡ Official Stellar Wallets Kit Integration

StarTip uses the official **Stellar Wallets Kit** ([stellarwalletskit.dev](https://stellarwalletskit.dev/)) provided by `@creit.tech/stellar-wallets-kit`:

- **Universal Wallet Support**:
  - 🦊 **Freighter** (Browser extension & mobile)
  - 🐂 **xBull Wallet**
  - 🦞 **LOBSTR**
  - 🌐 **Albedo**
  - ⚡ **Hana**, **Rabet**, **WalletConnect**, and more.
- **Direct Modal Invocation**:
  Uses `StellarWalletsKit.authModal()` directly from the official library to display the native wallet picker dialog.
- **Non-Custodial Challenge-Response Authentication**:
  Authenticates creators via SEP-0010 Ed25519 cryptographic signatures without passwords or private key exposure.

---

## 🚀 Running the Project

### Option A: With Docker Compose (Recommended)

1. **Clone and enter repository**:
   ```bash
   git clone https://github.com/your-username/startip.git
   cd startip
   ```

2. **Start all services**:
   ```bash
   docker compose up --build -d
   ```

3. **Verify running containers**:
   ```bash
   docker compose ps
   ```

4. **Access the application**:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API & Docs: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

5. **View logs**:
   ```bash
   # Follow logs for all services
   docker compose logs -f

   # Follow backend only
   docker compose logs -f web

   # Follow frontend only
   docker compose logs -f frontend
   ```

6. **Stop services**:
   ```bash
   docker compose down
   ```

---

### Option B: Running Locally (Development Mode)

#### 1. Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000
```

#### 2. Frontend:
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

#### 3. Soroban Smart Contract:
```bash
cd contracts
cargo test
# Build optimized WASM:
cargo build --target wasm32-unknown-unknown --release
```

---

## 🧪 Seeded Demo Data & Testing Accounts

The database comes pre-seeded with creators matching the specification:

### Creator 1: Tobi Ade (`@tobibuilds`)
- **Username**: `tobibuilds`
- **Display Name**: Tobi Ade
- **Receiving Wallet**: `GBXK4H2M2P6LNV2B6XQQ5U3VYV6Y2R6E762E44P3A4L2K7C4M3O2DEV1`
- **Overlay Token**: `3ecdb41a-f10e-48bf-9beb-f4dfd8373e69`
- **OBS Overlay Link**: [http://localhost:8000/overlay/3ecdb41a-f10e-48bf-9beb-f4dfd8373e69/](http://localhost:8000/overlay/3ecdb41a-f10e-48bf-9beb-f4dfd8373e69/)
- **Creator Tip Page**: [http://localhost:5173/tobibuilds](http://localhost:5173/tobibuilds)
- **Interactive Dual Demo**: [http://localhost:5173/demo?creator=tobibuilds](http://localhost:5173/demo?creator=tobibuilds)

### Creator 2: Alex River (`@alex_dev`)
- **Username**: `alex_dev`
- **Display Name**: Alex River
- **Receiving Wallet**: `GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2G2VRGV76LQ5NVGTZD4ME`
- **Overlay Token**: `aeab5b7c-8b37-44d5-bbaf-b5641bba9cf4`
- **Creator Tip Page**: [http://localhost:5173/alex_dev](http://localhost:5173/alex_dev)

---

## 🌐 Dokploy & Docker Live Deployment (startip.app)

StarTip is pre-configured for live deployment on **startip.app** using either [Dokploy](https://dokploy.com) (Compose or Application mode) or Docker Compose on a Linux VPS:

1. **Option 1: Dokploy Compose Deployment** (Recommended):
   - In Dokploy, create a new **Compose** service pointing to this repository.
   - Set environment variables in Dokploy:
     ```env
     DOMAIN=startip.app
     DJANGO_SECRET_KEY=generate-a-secure-random-64-char-key
     DJANGO_DEBUG=False
     DJANGO_ALLOWED_HOSTS=startip.app,.startip.app,www.startip.app
     CSRF_TRUSTED_ORIGINS=https://startip.app,https://*.startip.app,https://www.startip.app
     STELLAR_NETWORK=TESTNET
     STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
     STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
     OPENAI_API_KEY=sk-...
     ```
   - Click **Deploy**. Traefik will automatically provision Let's Encrypt SSL certificates for `startip.app`, route `/api`, `/admin`, `/overlay`, `/embed`, and `/media` to Gunicorn, and serve the high-performance Nginx React frontend.

2. **Option 2: Dokploy Single Application (Unified Container)**:
   - In Dokploy, create a new **Application** service using the root `Dockerfile`.
   - Uses `dokploy.json` for default production build, healthcheck, and environment configuration.

3. **Option 3: Direct VPS Deployment**:
   ```bash
   cp .env.example .env
   # Edit .env with your secrets
   docker compose up --build -d
   ```


---

## 🛡️ Automated Test Results

- **Django Test Suite**: 10/10 tests passed (`python manage.py test core`).
- **Soroban Smart Contract**: 4/4 tests passed (`cargo test`).
- **Frontend Build**: Verified clean production build (`npm run build`).
- **Docker Compose Configuration**: Passed validation with `docker compose config --quiet`.

---

## 📄 License
MIT License. Built on the Stellar Network.
