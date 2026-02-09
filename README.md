# Mainti - WhatsApp-First CMMS

A lightweight, mobile-first maintenance management system designed for zero-training onboarding and automatic WhatsApp request intake.

## 🚀 Quick Start

### 1. Connect to GitHub
Click the **"Connect to GitHub"** button in your development environment to sync this project to a new repository.

### 2. Database Setup (Supabase)
Login to your Supabase dashboard and run this script in the **SQL Editor**:
```sql
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'New',
  source TEXT DEFAULT 'Web',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
```

### 3. Deploy to Vercel
1. Import your GitHub repository to Vercel.
2. Add the following **Environment Variables**:
   - `API_KEY`: Your Google Gemini API Key.
   - `SUPABASE_URL`: `https://oygdrtvzoabboxycfdil.supabase.co`
   - `SUPABASE_ANON_KEY`: (Your full service role or anon key)

## 🛠 Tech Stack
- **Frontend**: React (ESM)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: Google Gemini API (Service Request Extraction)
- **Database**: Supabase
- **Deployment**: Vercel
