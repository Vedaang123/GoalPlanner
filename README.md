# Goal-Based Financial Planner (EMI, SIP & Inflation Analysis)

A full-stack cross-platform mobile application built with **React Native (Expo)**, **Node.js + Express**, and **MySQL**. The application computes compound inflation-adjusted target costs, derives required monthly Systematic Investment Plans (SIPs), tracks user contributions over time, and provides a Loan/EMI calculator with a full month-by-month amortization schedule.

---

## Architecture & Repository Structure

The project follows a three-tier client-server architecture organized into a clean monorepo:

```text
goal-planner/
├── backend/                # Node.js + Express REST API & calculation engine
│   ├── src/
│   │   ├── calc.js         # Pure-function financial formulas (EMI, SIP, Inflation)
│   │   ├── db.js           # MySQL connection pool configuration
│   │   └── server.js       # Express server, JWT middleware, and API routes
│   ├── .env.example        # Environment variable template
│   └── package.json
├── mobile/                 # React Native (Expo) cross-platform mobile client
│   ├── src/
│   │   ├── api.js          # Axios HTTP client with JWT interceptor
│   │   └── screens/        # Login, Register, Dashboard, Goal Detail, Loan/EMI screens
│   └── package.json
├── schema.sql              # Normalized MySQL database schema
└── .gitignore
```

---

## Prerequisites & Dependencies

Ensure the following software and tools are installed on your machine before setting up the project:

1. **Node.js (v18+ LTS)** & **npm** — Runtime environment for both the Express server and Expo CLI.
2. **MySQL Server (v8.0+)** & **MySQL Workbench** — Relational database engine for persisting users, goals, contributions, and loans.
3. **Android Studio (with Android Virtual Device / Emulator)** or **Expo Go** on a physical mobile device — Required to run and test the React Native frontend.
4. **Git** — For cloning and managing the repository.

### Key Project Dependencies
* **Backend (`backend/package.json`):** `express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`
* **Mobile (`mobile/package.json`):** `expo`, `react-native`, `@react-navigation/native`, `@react-navigation/native-stack`, `axios`, `@react-native-async-storage/async-storage`

---

## Step-by-Step Setup & Installation

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd goal-planner
```

### 2. Database Setup (MySQL)
1. Start your local **MySQL80** service.
2. Open **MySQL Workbench** (or your MySQL CLI) and execute the `schema.sql` file located in the root directory:
   ```sql
   SOURCE /path/to/goal-planner/schema.sql;
   ```
3. Verify that the `goal_planner` database is created with four normalized tables: `users`, `goals`, `contributions`, and `loans`.

### 3. Backend Server Setup (`backend/`)
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create your local `.env` file from the provided template:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env` and configure your local MySQL credentials and JWT secret:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=goal_planner
   JWT_SECRET=your_super_secret_jwt_key
   ```
4. Start the Express server:
   ```bash
   npm start
   ```
   *The server will start on `http://localhost:5000` and confirm an active connection to MySQL.*

### 4. Mobile App Setup (`mobile/`)
1. Open a new terminal window, navigate to the `mobile/` directory, and install dependencies:
   ```bash
   cd mobile
   npm install
   ```
2. Configure the backend API URL in `mobile/src/api.js`:
   * **For Android Emulator:** Use `http://10.0.2.2:5000` (routes directly to your host machine's `localhost:5000`).
   * **For iOS Simulator:** Use `http://localhost:5000`.
   * **For Physical Device (Expo Go):** Use your machine's local Wi-Fi IPv4 address (e.g., `http://192.168.1.X:5000`).
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Press **`a`** in the terminal to launch the app directly on your running Android Emulator, or scan the QR code using the **Expo Go** app.

---

## Normal Operation Flow

1. **Account Registration & Authentication:**
   * Launch the app and navigate to **New here? Register** to create a user account (passwords are hashed using `bcryptjs` before storage).
   * Log in with your credentials. The backend issues a signed **JWT (7-day expiry)**, which is stored locally on the device via `AsyncStorage` and attached automatically to all protected API requests.

2. **Creating a Inflation-Adjusted Goal:**
   * Tap **+ New Goal** from the **My Goals** dashboard.
   * Enter the **Goal Name** (e.g., *Laptop*), **Cost Today**, **Target Deadline (`YYYY-MM-DD`)**, **Expected Annual Inflation %**, and **Expected Annual Return %**.
   * Tap **Calculate & Save**. The Express server invokes `calc.js` to compute the compound inflated future cost and the required monthly SIP, saves the record to MySQL, and displays a confirmation summary.

3. **Logging Contributions & Tracking Progress:**
   * Tap on any goal card on the dashboard to view its detailed breakdown.
   * Enter a deposit amount and tap **Add Contribution**.
   * The system updates the visual progress bar, checks whether cumulative savings meet the expected schedule (**On Track** vs. **Behind**), and calculates a dynamic **Projected Completion Date**.

4. **Loan / EMI & Amortization Calculation:**
   * Tap **Loan / EMI Calculator** from the dashboard.
   * Enter the **Loan Principal**, **Annual Interest Rate (%)**, and **Tenure (Months)**, then tap **Calculate EMI**.
   * The app displays the fixed monthly **EMI**, **Total Interest Payable**, **Interest Share %**, and generates a full month-by-month **Amortization Schedule** reducing the closing balance to zero.