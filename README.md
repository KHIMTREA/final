# Bakong Shop – E-Commerce with Bakong KHQR

A full-stack mini e-commerce application featuring:

- **Next.js 14** (App Router + SSR) storefront
- **Spring Boot 3** (Java 21) REST API
- **PostgreSQL** + Flyway migrations
- **JWT + RBAC** (`ADMIN`, `STAFF`, `CUSTOMER`)
- **Bakong KHQR** payment integration (KHR) with mock mode for local development
- Admin analytics dashboard (revenue, top products, transaction reconciliation)

---

## Quick Start (Docker)

Start the database, backend, and frontend together:

```bash
docker compose up --build
```

Open the storefront at **http://localhost:3000**. The API is at **http://localhost:8080** and Swagger UI at **http://localhost:8080/swagger-ui.html**. Compose waits for PostgreSQL and the backend health checks before starting dependent services.

Stop the containers with `Ctrl+C`, or run `docker compose down` in another terminal. Database data is preserved in the `postgres_data` volume; `docker compose down -v` also removes that data.

The defaults are for local development. Set `JWT_SECRET` and `POSTGRES_PASSWORD` in the environment (or a root `.env` file) before using this setup outside a trusted local machine.

### Deploy to Vercel

This repo is configured so the Next.js storefront can be deployed from the repository root with Vercel. The Vercel project should use the root folder of this repository and the existing `vercel.json` file will run the frontend build from `frontend/`.

Set the following environment variable in the Vercel dashboard before deploying:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.example.com
```

`NEXT_PUBLIC_API_URL` must point to the deployed Spring Boot API. Vercel can host the Next.js frontend, but the Java backend is not deployable as a standard Vercel runtime; it should run on a Java-capable host such as Render, Railway, or another container service.

Docker starts in mock mode so checkout can generate a valid KHQR for local UI testing without Bakong credentials. These mock codes are not payable. For live Bakong payments, set `BAKONG_MOCK=false` and provide your Bakong Open API `BAKONG_TOKEN` and verified receiving `BAKONG_ACCOUNT_ID` in `.env`, then restart Compose. The token must remain private and should never be committed.

If the default ports are already in use, override them when starting Compose; the frontend API URL is a build-time setting:

```bash
FRONTEND_PORT=3300 BACKEND_PORT=8181 NEXT_PUBLIC_API_URL=http://localhost:8181 \
APP_CORS_ALLOWED_ORIGINS=http://localhost:3300,http://127.0.0.1:3300 \
docker compose up --build -d
```

---

## Demo Accounts

| Role     | Email              | Password   |
|----------|--------------------|------------|
| Admin    | admin@shop.local   | Admin@123  |
| Staff    | staff@shop.local   | Staff@123  |

---

## Project Structure

```
bakong-shop/
├── docker-compose.yml
├── backend/                 # Spring Boot (Gradle)
│   ├── src/main/java/com/shop/
│   │   ├── config/          # Security, DataInitializer
│   │   ├── controller/      # REST endpoints
│   │   ├── dto/
│   │   ├── entity/          # JPA entities matching schema
│   │   ├── repository/
│   │   ├── security/        # JWT filter + service
│   │   ├── service/         # Business logic + BakongService
│   │   └── exception/
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/    # Flyway SQL
└── frontend/                # Next.js 14 App Router
    └── src/
        ├── app/             # Pages (SSR + client)
        ├── components/
        ├── lib/api.ts       # Axios client
        └── store/           # Zustand (cart + auth)
```

---

## Key API Endpoints

| Method | Endpoint                              | Auth          | Description                          |
|--------|---------------------------------------|---------------|--------------------------------------|
| POST   | `/api/v1/auth/login`                  | Public        | Login → JWT                          |
| POST   | `/api/v1/auth/register`               | Public        | Register customer                    |
| GET    | `/api/v1/products`                    | Public        | Product catalog (SSR)                |
| POST   | `/api/v1/checkout/khqr`               | Public        | Create order + generate KHQR         |
| GET    | `/api/v1/checkout/verify/{md5}`       | Public        | Poll payment status                  |
| GET    | `/api/v1/admin/dashboard/summary`     | ADMIN/STAFF   | KPI cards                            |
| GET    | `/api/v1/admin/transactions`          | ADMIN         | Transaction list                     |
| GET    | `/api/v1/admin/transactions/analytics`| ADMIN         | Conversion rate, AOV, hourly density |
| POST   | `/api/v1/admin/users/{id}/roles`      | ADMIN         | Dynamic role assignment              |
| GET    | `/api/v1/orders`                      | ADMIN/STAFF   | Order list                           |

---

## Bakong KHQR Integration

### Live payments

The backend uses the official KHQR Java SDK to generate a payable KHQR for the configured Bakong receiving account, then calls Bakong's `check_transaction_by_md5` API during status polling. It marks an order paid only when Bakong confirms the transaction and the recipient, KHR currency, and amount match the order.

Set these variables in the root `.env` file:

```dotenv
BAKONG_MOCK=false
BAKONG_TOKEN=your-rotated-bakong-api-token
BAKONG_ACCOUNT_ID=your-verified-bakong-account-id
BAKONG_MERCHANT_NAME=Your Shop Name
```

Do not paste tokens into source files, commits, or support requests. The token previously posted in chat should be revoked and replaced.

### Local mock mode

Docker defaults to `BAKONG_MOCK=true` for local UI testing. Mock QR codes are not payable and cannot mark an order as paid. Set `BAKONG_MOCK=false` and provide real merchant credentials to enable live payments.

---

## Features Implemented

### Public Storefront (SSR)
- Home page product grid
- Product detail with Open Graph metadata
- Facebook & Telegram share buttons
- Shopping cart (Zustand + localStorage)
- Guest checkout form
- Bakong KHQR QR display + status polling
- Order confirmation page

### Admin / Staff Portal
- Executive KPI dashboard (revenue, orders, low-stock, customers)
- Top-selling products bar chart
- Product management (create, edit, and archive; archived products remain available in order history)
- Order management (admins can create, edit, and delete unpaid orders; paid status is controlled by Bakong verification)
- Transaction management and analytics (new transactions start pending; only Bakong verification can mark success)
- User management (admin-only create, edit, disable, delete, and role assignment; at least one enabled admin is preserved)
- Staff can view the dashboard and orders and manage products; order CRUD, users, and transactions are admin-only

### Security
- Stateless JWT authentication
- Role-based access control (`ROLE_ADMIN`, `ROLE_STAFF`, `ROLE_CUSTOMER`)
- Method-level `@PreAuthorize`
- CORS configured for frontend origin

---

## Environment Variables

| Variable              | Default                          | Description                    |
|-----------------------|----------------------------------|--------------------------------|
| `JWT_SECRET`          | (long default string)            | JWT signing key                |
| `BAKONG_MOCK`         | `true`                           | Generate non-payable mock QR codes |
| `BAKONG_TOKEN`        | –                                | Private Bakong Open API token  |
| `BAKONG_ACCOUNT_ID`   | –                                | Verified merchant Bakong account ID |
| `BAKONG_MERCHANT_NAME`| `Bakong Shop`                    | Merchant name on KHQR           |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080`          | Backend URL for frontend       |

---

## License

MIT – built as a final-year / portfolio project.
