# Bakong Shop – E-Commerce with Bakong KHQR

A full-stack mini e-commerce application featuring:

- **Next.js 14** (App Router + SSR) storefront
- **Spring Boot 3** (Java 21) REST API
- **PostgreSQL** + Flyway migrations
- **JWT + RBAC** (`ADMIN`, `STAFF`, `CUSTOMER`)
- **Bakong KHQR** payment integration (KHR) with mock mode for local development
- Admin analytics dashboard (revenue, top products, transaction reconciliation)

---

## Quick Start

### 1. Database

```bash
docker compose up -d
```

PostgreSQL will be available at `localhost:5432`  
(Database: `shop_db` / User: `shop_user` / Password: `shop_password`)

### 2. Backend

```bash
cd backend
./gradlew bootRun
# or: gradle bootRun
```

API runs at **http://localhost:8080**  
Swagger UI: http://localhost:8080/swagger-ui.html

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Storefront: **http://localhost:3000**

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
| POST   | `/api/v1/checkout/simulate-success/{md5}` | Public   | **Dev only** – mark payment success  |
| GET    | `/api/v1/admin/dashboard/summary`     | ADMIN/STAFF   | KPI cards                            |
| GET    | `/api/v1/admin/transactions`          | ADMIN         | Transaction list                     |
| GET    | `/api/v1/admin/transactions/analytics`| ADMIN         | Conversion rate, AOV, hourly density |
| POST   | `/api/v1/admin/users/{id}/roles`      | ADMIN         | Dynamic role assignment              |
| GET    | `/api/v1/orders`                      | ADMIN/STAFF   | Order list                           |

---

## Bakong KHQR Integration

### Development (default)

`app.bakong.mock-mode=true` generates:

- A valid-looking KHQR payload
- A real QR code image (PNG base64 via ZXing)
- In-memory status tracking

On the order confirmation page you can click **[Dev] Simulate Successful Payment** to complete the flow.

### Production

1. Register at https://api-bakong.nbc.gov.kh
2. Set environment variables:

```yaml
app:
  bakong:
    mock-mode: false
    email: your-registered-email
    account-id: your@bank
    merchant-name: Your Shop Name
```

3. Integrate the official Java SDK (`kh.gov.nbc.bakong_khqr:sdk-java`) or the community starter `io.github.tongbora:bakong-spring-boot-starter` inside `BakongService`.

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
- Product management table
- Order history & status
- Transaction analytics & reconciliation table
- Dynamic user role management (Admin only)

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
| `BAKONG_MOCK`         | `true`                           | Enable mock KHQR               |
| `BAKONG_EMAIL`        | –                                | Bakong Open API email          |
| `BAKONG_ACCOUNT_ID`   | –                                | Merchant Bakong ID             |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080`          | Backend URL for frontend       |

---

## License

MIT – built as a final-year / portfolio project.
