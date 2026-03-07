# Portfolio Tracker

Full-stack investment tracking application inspired by Delta.

## Features

- Track crypto, stocks, ETFs, metals, and custom assets
- Real-time price updates from multiple free APIs (CoinGecko, Yahoo Finance)
- Portfolio performance chart (24h, 7d, 30d, 1y)
- Hourly price snapshots stored in DB
- Wallet monitoring with push notifications
- Multi-portfolio support
- Dark mode UI

## Deploy on a server

### Prerequisites

- [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on the machine

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/Marcla30/portfolio-tracker.git
cd portfolio-tracker
```

**2. Configure environment**
```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
```env
# Generate with: openssl rand -base64 32
SESSION_SECRET=your-long-random-secret-here
```

Optional — change ports if already in use on your machine:
```env
APP_PORT=3000   # port to access the app
DB_PORT=5432    # port exposed for PostgreSQL
```

**3. Start**
```bash
docker-compose up -d
```

The database schema is applied automatically on first start.

**4. Access the app**

Open `http://your-server-ip:3000` (or the `APP_PORT` you configured).

Create your account on the registration page. You can disable registration afterwards by setting `REGISTRATION_ENABLED=false` in `.env` and restarting.

### Update to a new version

```bash
git pull
docker-compose up -d --build
```

### Useful commands

```bash
# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Stop and delete all data (irreversible)
docker-compose down -v
```

---

## Development (local without Docker)

```bash
npm install
cp .env.example .env
# Edit .env with a local DATABASE_URL pointing to your Postgres instance
npx prisma migrate dev
npm run dev
```

For local development with Docker and live reload:
```bash
# Create docker-compose.override.yml with volume mounts
cat > docker-compose.override.yml <<EOF
services:
  app:
    volumes:
      - ./src:/app/src
      - ./public:/app/public
EOF
docker-compose up -d
```

---

## Tech Stack

- Backend: Node.js, Express, Prisma, PostgreSQL
- Frontend: Vanilla JS, Chart.js
- APIs: CoinGecko, Yahoo Finance, Frankfurter, Blockchair
- Deployment: Docker, Docker Compose

## Architecture

```
/src
  /routes       - API route handlers
  /services     - Business logic
  /middleware   - Auth and other middleware
  /jobs         - Cron jobs
/public
  /controllers  - Frontend controllers
  /services     - API client
  /styles       - CSS files
/prisma
  schema.prisma - Database schema
```
