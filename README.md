# Cashbook App 📒💰

Cashbook App is a modern, fast, and secure Progressive Web App (PWA) built to help individuals and businesses seamlessly track their income, expenses, and pending dues across multiple ledgers.

Built on the latest React 19 and Firebase V12 ecosystem, it offers real-time synchronization, enterprise-grade Role-Based Access Control (RBAC) for team collaboration, and beautiful data visualization.

---

## 🏗️ Software Requirements Specification (SRS)

### Core Features
1. **Multi-Ledger Management:** Users can create distinct, isolated cashbooks for different businesses, personal accounts, or projects.
2. **Transaction Tracking:** Ability to securely log "Cash In" and "Cash Out" events with timestamps, custom categories, and notes.
3. **Dues & Debt Tracking:** Dedicated module to keep a running list of pending receivables and payables.
4. **Bulk Importing:** Rapidly import or add multiple transactions simultaneously to save time.
5. **Data Visualization:** Interactive dashboards and charts summarizing financial health.
6. **Progressive Web App (PWA):** Must be installable directly to mobile phones or desktops for an offline-capable, app-like experience.

### Collaboration & Security Requirements
1. **Granular RBAC:** Users must be able to share specific ledgers via email.
2. **Permission Levels:** Support for exact roles: `Owner`, `CAN_VIEW`, or fine-grained booleans (`canAdd`, `canEdit`, `canDelete`).
3. **Database Security:** Firestore rules must mathematically prevent unauthorized access at the database level, ensuring users can only read/write ledgers they explicitly own or have been invited to.

---

## 📐 Design Document (DD) & Architecture

### Tech Stack
* **Frontend Framework:** React 19 + Vite 8
* **Styling:** Tailwind CSS v4 + PostCSS
* **Routing:** React Router DOM v7
* **Database & Auth:** Firebase v12 (Firestore, Firebase Authentication)
* **Data Visualization:** Recharts
* **Notifications:** React Hot Toast
* **Icons & UI:** Custom modular components

### Database Schema Architecture (Firestore)
* **`users/{userId}`**: Stores user profiles.
* **`cashbooks/{cashbookId}`**: Stores the ledger metadata, owner ID, and `sharedWith` permission objects (RBAC mapping).
  * **`transactions/` (Subcollection)**: Financial entries (In/Out) strictly belonging to the parent cashbook.
  * **`dues/` (Subcollection)**: Pending payments.
  * **`categories/` (Subcollection)**: Custom categorization tags for transactions.

### Security Rules Architecture
The app relies on robust Firestore Rules for security:
* `isOwner(cashbook)`: Grants full access.
* `isCollaborator(cashbook)`: Checks if the user's email exists in the `sharedWith` map.
* `canAdd / canEdit / canDelete`: Granular functions that parse the `sharedWith` map to evaluate boolean permissions before allowing any write operation.

---

## 🚀 Technical Setup & Deployment

### 1. Prerequisites
* Node.js (v18+)
* A Firebase Project (with Firestore and Authentication enabled)

### 2. Firebase Setup
1. Create a `.env` file in the root directory by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase configuration variables in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your_app_id
   ```
3. **CRITICAL:** Deploy the strict database rules by copying `firestore.rules` directly into your Firebase Console (Firestore -> Rules).

### 3. Installation & Running Locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### 4. Building for Production

```bash
# Build the optimized PWA bundle
npm run build

# Preview the production build locally
npm run preview
```

---
*Built with ❤️ and React 19.*
