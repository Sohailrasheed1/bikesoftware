# Skander Spare Parts — Bike Shop Management Software

> **Complete Motorcycle Spare Parts Shop Management System** built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Shadcn UI (Light Theme & Glassmorphism)**, **NextAuth**, and a clean **Repository Pattern** (Local-first persistent storage, ready for MongoDB).

---

## 🚀 Key Features

### 1. 📊 Comprehensive Business Dashboard
- Real-time KPI Stat Cards: Total Inventory Value (PKR), Parts Count, Today's Sales & Bills, Low/Out-of-Stock counters, Supplier Khata.
- **15+ Days Overdue Supplier Credit Alerts:** Automatic warning banner for credit pending over 15 days to protect cash flow.
- **Urgent Stock Alert Table:** Real-time low stock table with 1-click restock actions.
- Recent bills feed and quick navigation.

### 2. 🧾 Fast Counter POS & Billing
- **Customer Auto-fill:** Instant autocomplete for existing customers; auto-populates motorcycle model (Honda CD 70, CG 125, Yamaha YBR, Suzuki GS 150) and registration number.
- **Over-selling Prevention:** Real-time stock validation prevents adding more items than physically available in inventory.
- **Automatic Stock Deduction:** Deducts inventory counts immediately when a bill is completed.
- **Printable Receipt Modal:**
  - **Thermal 80mm POS Slip** layout.
  - **Standard A4/A5 Invoice** layout.
  - One-click toggles between **Customer Copy** and **Shop Copy**.
  - Urdu/English shop policy footer (`بیچا ہوا مال واپس یا تبدیل نہیں ہوگا`).

### 3. 📦 Inventory Management (اسٹاک کا نظام)
- Full parts catalog with cost price, selling price, and automatic profit margin percentage display.
- Stock health indicators (`In Stock`, `Low Stock`, `Out of Stock`).
- Direct inline stock adjustments (`+` / `-`).
- Filter by category, filter by stock status, and instant search.
- Complete Add/Edit/Delete part modals.

### 4. 👥 Customer Management
- Directory with customer name, phone, motorcycle model, registration number, and address.
- Lifetime total spending and visit counter.
- **Purchase History Modal:** Complete breakdown of previous purchases, dates, and itemized parts.

### 5. 📜 Bill History & Stock Restoration
- Date-wise searchable list of all generated bills.
- Re-print receipts anytime.
- **Cancel Bill & Stock Restoration:** Cancelling an erroneous bill automatically returns items back to inventory and adjusts customer spending records.

### 6. 💼 Supplier Credit Management (ادھار / کھاتہ)
- Record purchases on credit from suppliers.
- Track pending, partial, and paid statuses.
- Record payment installments with date and notes.
- 15+ days overdue warning highlights.

### 7. 📈 Reports & Business Analytics
- **Daily Report:** Today's turnover, estimated profit, and items sold.
- **Monthly Report:** Monthly revenue trends and bill volume.
- **Yearly Report:** Annual turnover summary.
- **Top-Selling Motorcycle Parts:** Ranked by quantity sold and revenue generated.
- **Export to CSV:** 1-click download of report data for external accounting.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom Glassmorphism utilities & Light Theme
- **Icons:** Lucide React
- **Authentication:** NextAuth (Credentials provider)
- **Data Architecture:** Clean Repository Pattern (`IStorageService` -> `LocalStorageService` with Karachi motorcycle market pre-seeded data, ready for `MongoStorageService` with Mongoose).

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/Sohailrasheed1/BikeshopSoftware.git

# Navigate into project directory
cd BikeshopSoftware

# Install dependencies
npm install

# Run development server
npm run dev

# Or build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Login Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Manager** | `sohail` | `sohail123` |
| **Staff** | `staff` | `staff123` |

*(1-click demo login buttons are also available on the login page)*

---

## 📄 License
Private commercial software for **Skander Spare Parts**, Karachi, Sindh, Pakistan.
