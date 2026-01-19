# PolyTrader - Polymarket Paper Trading Platform

A comprehensive web application for paper trading and real trading on Polymarket, built with Next.js and deployable on Vercel.

![Trading Modes](https://img.shields.io/badge/Modes-Paper%20|%20Live%20|%20Shadow-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

## Features

- 🎯 **Three Trading Modes**: Paper, Live, and Shadow trading with clear visual indicators
- 📈 **Polymarket Integration**: Full CLOB, Gamma, and Data API support
- 🤖 **Python Strategy Execution**: Write and run custom trading strategies
- 📊 **Real-time Dashboard**: Monitor positions, orders, and P&L
- 🔒 **Security First**: Encrypted credentials, audit logging, RBAC
- ⚡ **Vercel-Native**: Fully serverless, scheduled with Cron Jobs

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Vercel Postgres recommended)
- Polymarket account with API access

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd polymarket-trader
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth (generate with: openssl rand -base64 32)
AUTH_SECRET="your-secret"

# Encryption key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="64-char-hex-key"

# Cron secret
CRON_SECRET="your-cron-secret"
```

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
polymarket-trader/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login/register pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── disclaimer/        # Risk disclaimer
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard components
│   ├── strategies/       # Strategy editor
│   └── risk/             # Risk management
├── lib/                   # Core libraries
│   ├── polymarket/       # Polymarket API client
│   ├── trading/          # Broker implementations
│   ├── simulation/       # Paper trading engine
│   ├── crypto/           # Encryption utilities
│   ├── audit/            # Audit logging
│   └── validation/       # Zod schemas
├── python_strategies/     # Python strategy SDK & examples
│   ├── sdk/              # Strategy SDK
│   └── examples/         # Example strategies
└── prisma/               # Database schema
```

## Trading Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Paper** | Simulated trading with virtual funds | Learning, testing strategies |
| **Live** | Real trades on Polymarket | Production trading |
| **Shadow** | Live data, no real orders | Validating before going live |

## Writing Strategies

Strategies follow a standard Python interface:

```python
def initialize(config: dict) -> None:
    """Called once when strategy is loaded"""
    pass

def on_tick(market_state: dict) -> None:
    """Called on each market update"""
    pass

def propose_orders(context: dict) -> list:
    """Return list of proposed orders"""
    return []

def risk_check(order: dict, context: dict) -> bool:
    """Return True to allow order, False to block"""
    return True
```

See `python_strategies/examples/` for complete examples.

## API Reference

### Markets
- `GET /api/markets` - List active markets
- `POST /api/markets` - Search markets

### Strategies
- `GET /api/strategies` - List user strategies
- `POST /api/strategies` - Create strategy
- `PUT /api/strategies/[id]` - Update strategy
- `DELETE /api/strategies/[id]` - Delete strategy
- `POST /api/strategies/[id]/run` - Run strategy

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Place order
- `DELETE /api/orders` - Cancel order

### Risk
- `GET /api/risk` - Get risk config
- `PUT /api/risk` - Update risk config
- `POST /api/risk` - Kill switch actions

## Deployment on Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create Vercel Project

```bash
npx vercel
```

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL` - Vercel Postgres URL
- `AUTH_SECRET` - Random 32+ char string
- `ENCRYPTION_KEY` - 64 char hex string
- `CRON_SECRET` - Random 32+ char string

### 4. Set Up Database

Create a Postgres database in Vercel Dashboard → Storage.

### 5. Deploy

```bash
npx vercel --prod
```

## Security Considerations

- ⚠️ Never commit `.env` files
- 🔐 Credentials are encrypted at rest with AES-256-GCM
- 📝 All actions are logged in immutable audit log
- 🛡️ Rate limiting on sensitive endpoints
- 🚨 Kill switch for emergency trading stop

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret key |
| `ENCRYPTION_KEY` | Yes | 64-char hex key for credential encryption |
| `CRON_SECRET` | Yes | Secret for cron job authentication |
| `POLYMARKET_CLOB_URL` | No | CLOB API URL (default provided) |
| `POLYMARKET_GAMMA_URL` | No | Gamma API URL (default provided) |
| `POLYMARKET_DATA_URL` | No | Data API URL (default provided) |

## Limitations

1. **No WebSocket support**: Vercel doesn't support persistent connections. Data is fetched via polling.
2. **Strategy timeout**: Python strategies have 60s max execution time.
3. **Bundle size**: Python dependencies limited to 250MB total.
4. **Cold starts**: First invocation takes 1-2 seconds.

## License

MIT License - See LICENSE file for details.

## Disclaimer

This software is for educational purposes. Trading on prediction markets involves substantial risk of loss. The developers are not responsible for any financial losses incurred through use of this software.
