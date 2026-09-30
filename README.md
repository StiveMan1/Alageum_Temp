# ALAGEUM.COM pre-Discovery foundation

Production-oriented modular-monolith foundation for a multi-tenant B2B platform. All bundled
organizations, products, orders and documents are synthetic DEV data. No Alageum business rules,
API contracts or production credentials are inferred here.

## First run

Requirements: Docker with Compose v2, `make`, `curl`, and 4 GB free memory.

```bash
make bootstrap
```

Bootstrap copies `.env.example` to `.env` when absent, builds pinned images, starts PostgreSQL,
runs Alembic, waits for readiness and installs the deterministic DEV seed.

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/v1
- OpenAPI: http://localhost:8000/docs
- Liveness: http://localhost:8000/api/v1/health
- Readiness: http://localhost:8000/api/v1/readiness

DEV ONLY accounts use `ChangeMe123!`:

- `admin@demo.example` — placeholder administrator in Demo Industrial Company;
- `buyer@demo.example` — placeholder buyer;
- `engineer@demo.example` — placeholder engineer;
- `accountant@demo.example` — tenant-isolation account in Demo Supplier.

These roles are examples, not the Alageum permission matrix.

## Commands

```text
make bootstrap       build/start/migrate/seed a new checkout
make dev / make down start or stop without deleting data
make reset           guarded DEV volume reset, migrate and seed
make demo-reset      deterministic alias for reset
make build           build images
make lint            backend and frontend lint
make test-backend    backend tests
make test-e2e        Playwright against running Compose
make migration-check compare ORM metadata with Alembic head
make smoke           API/frontend smoke suite
make backup          create PostgreSQL custom-format backup
make restore BACKUP=/absolute/file.dump
```

`make reset` refuses `APP_ENV=staging` and `APP_ENV=production`. Backups contain PostgreSQL only;
file-object bytes require a separate storage-provider backup.

## Local development

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.lock
cd frontend && npm ci
```

Schema changes use Alembic only; the application never calls `metadata.create_all()` at startup.
Production deployments must run migrations as an explicit reviewed release step.

Architecture and onboarding: [architecture](docs/architecture.md),
[development](docs/development.md), [API contract](docs/api-contract.md), and
[pre-Discovery status](docs/pre-discovery-status.md). Operational guides:
[deployment](docs/deployment.md), [backup/restore](docs/backup-restore.md), and
[runbook](docs/runbook.md). Unresolved client decisions remain in
[Discovery TODOs](docs/discovery-todos.md).

## Freeze boundary

Real ERP/1C, CRM, EDO, logistics, product taxonomy, roles, workflows, commercial rules, AI policy,
content and branding are explicitly out of scope until Discovery.
