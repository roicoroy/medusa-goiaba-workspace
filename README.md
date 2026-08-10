# Goiaba POS (Point of Sale) System

A Proof of Concept (POC) Point of Sale system built with a headless **Medusa.js** backend and a modern **Angular/Ionic** frontend, designed to run natively via **Electron/Capacitor**.

## Project Architecture

This workspace is structured as a monorepo containing:
- **Backend (`apps/backend`)**: A Medusa.js headless e-commerce server handling products, carts, orders, and authentication.
- **Frontend POS (`apps/pos`)**: An Angular 15+ standalone app wrapped in Ionic, providing the tablet-optimized POS UI.
- **Infrastructure**: Dockerized PostgreSQL and Redis for backend persistence.

## Getting Started

### 1. Database & Infrastructure
Ensure your Docker containers for PostgreSQL and Redis are running.

### 2. Backend (Medusa)
Start the Medusa server from the backend directory:
```bash
cd apps/backend
pnpm run dev
```

**Admin Dashboard Credentials:**
- **Email:** `admin@email.com`
- **Password:** `debug123`

### 3. Frontend (Ionic POS)
Start the Ionic development server:
```bash
cd apps/pos
ionic serve
```

## Features & Implementation Notes

### State Management
The POS frontend uses **NGXS** for global state management:
- **Cart State (`CartState`)**: Validates and synchronizes the active cart session with the Medusa backend.
- **Products State (`ProductsState`)**: Fetches and stores the Medusa product catalog for instant POS querying.

### Barcode Scanning & Product Identification
- Medusa natively supports barcodes on the **Product Variant** level.
- No custom plugins or database extensions are required.
- To register a new product with a barcode, simply populate the standard `barcode` field on the Product Variant in the Medusa Admin panel. The POS app will use this field to match physical USB scanner input.

## References & Inspiration

- [Medusa POS Recipe](https://docs.medusajs.com/resources/recipes/pos)
- [LuckyCRM POS GitHub Example](https://github.com/luckycrm/medusajs-pos-app)
- [Building a POS system based on Medusa](https://newsletter.codee.dev/p/en-how-we-built-a-pos-system-based)