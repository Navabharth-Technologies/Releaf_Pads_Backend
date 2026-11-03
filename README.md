# ReLeaf Pads - Backend Service & API Engine

Welcome to the **ReLeaf Pads Backend Service & API Engine**, an enterprise-grade cloud backend architected to power the hyperlocal commerce, real-time inventory tracking, multi-order delivery queue logistics, conversational ordering, and secure payment processing for **ReLeaf Pads**.

The backend operates as a high-availability cloud microservice deployed on **Azure App Service**, interfaced with an **Azure PostgreSQL / SQL Database**, **Meta WhatsApp Cloud API**, and **Razorpay Payment Gateway**.

---

## 📂 Project Structure

| Component | Path | Technology | Description |
| :--- | :--- | :--- | :--- |
| **Server & REST APIs** | `./server.js` | Node.js / Express | Core HTTP server, routing, middleware, and business logic |
| **Database Connector** | `./db.js` | PostgreSQL (`pg`) / Azure SQL | Connection pooling, schema initialization, and transactional queries |
| **WhatsApp Automation** | `./services/whatsappService.js` | Meta Graph API | Webhook verification, conversational ordering bot, order status notifications |
| **Conversational AI** | `./services/aiService.js` | Natural Language Processing | Intent parsing for customer ordering, product recommendation, and address queries |
| **Legal & Compliance** | `./privacy-policy.html` | HTML5 / CSS3 | Publicly hosted Privacy Policy for Google Play Store Console compliance |
| **Database Migrations** | `./fix_schema.js`, `./alterDb.js` | SQL Scripts | Schema fixes, table alters, seed initializations, and index optimization |
| **CI/CD Workflow** | `./.github/workflows/azure.yml` | GitHub Actions | Automated build, test, and zero-downtime deployment to Azure App Service |

---

## ✨ Core Backend Capabilities

### 🛍️ Hyperlocal E-Commerce & Catalogue API
- **Dynamic Product Catalogue**: Manage SKU variants (Cotton-soft Regular, XL, XXL Heavy Flow, Extra-Long Night Pads, Panty Liners), pack counts, pricing, MRP, and discount margins.
- **Stock & Inventory Control**: Real-time stock status management (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) with instant synchronization across mobile and web clients.
- **Serviceable Area Verification**: Automated postal PIN-code validation strictly scoped to Mysuru municipal boundaries (570001 to 570026) with fallback redirection for out-of-area requests.

### 💳 Secure Payment Processing & Webhooks
- **Razorpay Integration**: Server-side order creation (`/api/payments/create-order`) and cryptographic signature verification (`/api/payments/verify`).
- **Webhook Listener**: Real-time asynchronous capture of payment success, refund notifications, and transaction settlement references.
- **Background Reconciliation**: Automatic verification routine reconciling pending transactions to avoid dropped or duplicate orders.

### 🛵 Multi-Order Delivery Logistics & FIFO Queue
- **Concurrent Assignment Engine**: Allows store owners to assign multiple continuous orders simultaneously to a single delivery partner without offline constraints.
- **Sequential Manifest Queue**: Automatic progression to the next assigned order upon marking the current order delivered.
- **Live State Machine**: Tracks order milestones with verified transitions:
  `CONFIRMED` ➔ `ASSIGNED` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED` (or `CANCELLED`).
- **Real-Time Counters**: Synchronous aggregation of daily delivery counts, pending runs, and gross revenue collections across both rider and owner portals.

### 💬 WhatsApp Business Automated Ordering Bot
- **Meta Graph API Webhook**: Secure HMAC SHA256 webhook signature validation and bidirectional message routing.
- **Conversational Ordering**: Context-aware ordering engine recognizing returning customers, auto-fetching saved delivery addresses, and processing orders via chat.
- **Automated Alerts**: Real-time transactional notifications sent to customers upon order confirmation, rider dispatch, and doorstep drop-off.

### 🛡️ Security, Governance & Google Play Compliance
- **TLS 1.3 / HTTPS Encryption**: Enforced end-to-end data encryption in transit for all client-to-server communications.
- **Public Privacy Policy Endpoint**: Serves a standalone, non-editable HTML policy page at `/privacy-policy` fulfilling Google Play Store Console compliance.
- **Role-Based Access Control**: Separate authenticated interfaces for Customer access, Delivery Partner PIN login, and Owner administrative operations.

---

## 🛠️ API Reference Summary

### Public & Customer Endpoints
- `GET /` — Health check endpoint
- `GET /privacy-policy` — Public Google Play compliant Privacy Policy
- `GET /api/products` — Fetch active product catalogue and inventory status
- `POST /api/customers` — Register or retrieve returning customer profile
- `POST /api/orders` — Create new customer delivery order
- `GET /api/orders/:id` — Retrieve real-time order tracking details

### Payment Endpoints
- `POST /api/payments/create-order` — Generate Razorpay order ID and checksum
- `POST /api/payments/verify` — Verify cryptographic payment signature
- `POST /api/webhook/razorpay` — Asynchronous payment settlement webhook

### Owner / Admin Endpoints
- `POST /api/owner/login` — Administrative authentication
- `POST /api/owner/products` — Add or modify product SKUs, pricing, and pack sizes
- `PUT /api/owner/products/:id/stock` — Toggle real-time product stock availability
- `GET /api/owner/orders` — Live order stream with filtering by status
- `POST /api/owner/assign-order` — Assign single or multiple orders to delivery personnel
- `GET /api/owner/reports` — Daily/monthly revenue and delivery performance reports

### Delivery Partner Endpoints
- `POST /api/delivery/login` — Phone-based rider authentication
- `GET /api/delivery/orders/:partnerId` — Fetch active FIFO delivery manifest queue
- `PUT /api/delivery/orders/:id/status` — Advance order status (`OUT_FOR_DELIVERY`, `DELIVERED`)

### WhatsApp Integration
- `GET /api/webhook` — Meta Webhook challenge verification
- `POST /api/webhook` — Inbound message processor and conversational ordering handler

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS Version 20.x or 24.x)
- npm (v10.x or higher)
- PostgreSQL Server (Local or Azure Database for PostgreSQL)
- Active Razorpay API Keys (Key ID & Secret)
- Meta WhatsApp Business API Cloud Credentials

### Local Environment Configuration
Create a `.env` file in the root of the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Azure PostgreSQL / Local)
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SERVER=releafpad.database.windows.net
DB_PORT=5432
DB_NAME=Releaf_Pads
DB_SSL=true

# Authentication
OWNER_USERNAME=owner
OWNER_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Meta WhatsApp Cloud API
WHATSAPP_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=releaf_whatsapp_token_123

# Azure Web App Details
AZURE_WEBAPP_NAME=Releafpadbackend
```

### Installation & Execution
```bash
# 1. Clone repository
git clone https://github.com/Navabharth-Technologies/Releaf_Pads_Backend.git

# 2. Navigate to directory
cd Releaf_Pads_Backend

# 3. Install production & development dependencies
npm install

# 4. Initialize / Sync database schema
node db.js

# 5. Start the backend service
npm start
```
*Service will start listening on `http://localhost:5000` (or configured `PORT`).*

---

## ☁️ Deployment Architecture (Azure App Service)

The service is configured for continuous zero-downtime deployment via **GitHub Actions** (`.github/workflows/azure.yml`):

1. **Trigger**: Every push or merge to the `main` branch automatically initiates the build and deployment pipeline.
2. **Runtime**: Node.js 24.x on Linux Azure App Service.
3. **Live Production Endpoint**:  
   `https://releafpadbackend-h0bwephqd3ctazgn.centralindia-01.azurewebsites.net/`
4. **Live Privacy Policy**:  
   `https://releafpadbackend-h0bwephqd3ctazgn.centralindia-01.azurewebsites.net/privacy-policy`

---

## 🤝 Contribution & Maintenance

This backend platform is architected, developed, and maintained by the **Navabharath Technologies Engineering Team** for **ReLeaf Pads**.

- **Organization**: Navabharath Technologies
- **Official Website**: https://www.releafpads.in/
- **Production Server**: [Azure App Service](https://releafpadbackend-h0bwephqd3ctazgn.centralindia-01.azurewebsites.net/)
- **Technical Inquiries**: contact@navabharathtechnologies.com

For security disclosures, API documentation, or feature enhancements, please contact the repository administrator.

*© 2026 Navabharath Technologies. All Rights Reserved.*
