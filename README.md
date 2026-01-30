# Pointly

Smart loyalty platform for Saudi merchants.

## Prerequisites

- Node.js 24.13.0 LTS
- pnpm 10.0.1
- Docker 29.x
- AWS CLI 2.x
- AWS CDK 2.174.3

## Getting Started
```bash
# Install dependencies
pnpm install

# Start local development environment
pnpm docker:up

# Run development servers
pnpm dev
```

## Project Structure
```
pointly/
├── apps/
│   ├── api/                 # Backend API
│   ├── merchant-dashboard/  # Merchant web app
│   └── customer-portal/     # Customer web app
├── packages/
│   ├── shared/              # Shared types & utilities
│   └── infrastructure/      # AWS CDK infrastructure
└── docker/                  # Docker configurations
```

## Commands

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all apps
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm check` - Format and lint
- `pnpm infra:deploy` - Deploy AWS infrastructure

## License

Private - All Rights Reserved
