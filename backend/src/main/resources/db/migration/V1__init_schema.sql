-- Dynamic Roles
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL  -- ROLE_ADMIN, ROLE_STAFF, ROLE_CUSTOMER
);

-- Users Table
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(20),
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User-Roles Join Table (RBAC)
CREATE TABLE user_roles (
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     INT    NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Products Catalog Table
CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(12, 2) NOT NULL,          -- stored in KHR
    stock_quantity  INT NOT NULL DEFAULT 0,
    image_url       VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE / INACTIVE
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders Header Table
CREATE TABLE orders (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- Nullable for Guest
    customer_name       VARCHAR(100) NOT NULL,
    email               VARCHAR(100) NOT NULL,
    phone               VARCHAR(20)  NOT NULL,
    shipping_address    TEXT NOT NULL,
    total_khr           DECIMAL(15, 2) NOT NULL,
    payment_status      VARCHAR(30) NOT NULL DEFAULT 'PENDING',   -- PENDING, PAID, FAILED, EXPIRED
    order_status        VARCHAR(30) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, SHIPPED, DELIVERED, CANCELLED
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Detail Table
CREATE TABLE order_items (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id),
    unit_price      DECIMAL(12, 2) NOT NULL,
    quantity        INT NOT NULL CHECK (quantity > 0)
);

-- Transactions Log Table (Bakong KHQR Analytics & Audit)
CREATE TABLE transactions (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    khqr_md5        VARCHAR(64) UNIQUE NOT NULL,       -- Unique identifier from Bakong
    currency        VARCHAR(10) NOT NULL DEFAULT 'KHR',
    amount_khr      DECIMAL(15, 2) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- PENDING, SUCCESS, EXPIRED, FAILED
    from_account    VARCHAR(100),
    bakong_hash     VARCHAR(128),
    raw_response    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_name     VARCHAR(50)  NOT NULL,
    entity_id       BIGINT,
    details         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_khqr_md5 ON transactions(khqr_md5);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
