# KasirGrafity - Modern POS System

A robust, offline-first Point of Sale (POS) system built for reliable performance and easy scalability.

## 🚀 Tech Stack

- **Frontend:** React + Vite
- **Database:** Supabase (PostgreSQL) + Dexie.js (Offline Sync)
- **Styling:** Tailwind CSS
- **State Management:** Zustand

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/kasirgrafity.git
   cd kasirgrafity
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy `.env.example` to `.env` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## 🏃‍♂️ Running Locally

Start the development server:

```bash
npm run dev
```

Access the app at `http://localhost:5173`.

## 📦 Building for Production

Create a production-ready build:

```bash
npm run build
```

The output will be in the `dist/` directory.

## 🚀 Deployment

This project is optimized for deployment on Vercel. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
