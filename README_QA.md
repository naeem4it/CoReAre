# DBARc - QA Deployment & Execution Guide

This directory contains automated batch files for rapid setup and execution on QA environments (e.g., `D:\DBARC\CoReAre`).

---

## 🚀 Quick Start for QA Machines

### Step 1: Initial QA Setup (Run Once)
Double-click:
```bat
SETUP_FOR_QA.bat
```
This script will automatically:
1. Validate **Node.js** and **npm** prerequisites.
2. Generate all environment configuration files:
   - `DBARc-backend\.env`
   - `DBARc-Tenant\.env.local`
   - `DBARc-Courier\.env.local`
3. Install all npm dependencies for Backend, Tenant, and Courier apps.
4. Check PostgreSQL connection on `127.0.0.1:5432` and create `dbarc_db` if not found.
5. Restore database schema and tables (`DBARc_Schema_2026June2.sql`) using `psql` if the database is empty.
6. Configure & pre-build Strapi (`npm run build`) so TypeScript and Admin UI are pre-compiled with zero runtime delay.
7. Seed default QA tenants, shipper accounts, and admin/super-admin roles (`npm run db:seed`).

---

### Step 2: Run All Applications
Double-click:
```bat
RUN_SYSTEM.bat
```
This launches all three components concurrently from one file:
- **DBARc Backend API**: `http://localhost:1337/admin`
- **DBARc Tenant Portal**: `http://localhost:3000`
- **DBARc Courier Operations**: `http://localhost:3001`

*(Browser tabs will open automatically ~8 seconds after initialization)*

---

### Step 3: Stop Applications
Double-click:
```bat
STOP_SYSTEM.bat
```
Safely terminates all background services on ports `1337`, `3000`, and `3001`.

---

### Step 4: Update Applications (When new code is copied)
Double-click:
```bat
UPDATE_SYSTEM.bat
```
Updates packages across all sub-apps and resyncs database configurations.

---

## 🔑 Default QA Test Credentials

### 1. Courier Operations Portal (`http://localhost:3001`)
- **Email**: `naeemcourier@test.com`
- **Password**: `Password123!`

### 2. Tenant / Shipper Portal (`http://localhost:3000`)
- **Email**: `naeemshiper@test.com`
- **Password**: `Password123!`

### 3. Strapi Admin CMS (`http://localhost:1337/admin`)
- **Super Admin Email**: `naeem4it@gmail.com`
- **Password**: `Password123!`
- *(Also accessible with `naeemcourier@test.com` and `naeemshiper@test.com`)*
