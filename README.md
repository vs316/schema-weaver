# ERD Studio

A visual Entity-Relationship Diagram (ERD) editor built with React, TypeScript, and Supabase.

## Local Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
VITE_SUPABASE_PROJECT_ID="ekafxpolsdhlktmsgexd"
VITE_SUPABASE_URL="https://ekafxpolsdhlktmsgexd.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYWZ4cG9sc2RobGt0bXNnZXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDc1ODUsImV4cCI6MjA4MjU4MzU4NX0.pWorY9v_1CG3R8DsxuYPU5nUEh9ceOO-cMhd3V4U_WA"
```

> **Note:** These are the publishable (anon) keys which are safe to use in frontend code. They only allow access according to your Row Level Security (RLS) policies.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### 5. Build for Production

```bash
npm run build
npm run preview
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 8080 |
| `npm run build` | Build for production |
| `npm run build:dev` | Build with development mode (includes source maps) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Lovable Cloud)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Routing:** React Router v7

## Project Structure

```
src/
├── components/          # React components
│   ├── layout/          # Layout components (sidebars, panels)
│   ├── ui/              # Reusable UI components
│   └── ...
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client & types
├── pages/               # Page components
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Diagnostics

The app includes a built-in diagnostics panel (bottom-right corner) that shows:
- Backend configuration status
- Environment variable sources
- Build mode
- System information

Use this to verify your local setup is working correctly.

## Troubleshooting

### "supabaseUrl is required" Error

This means environment variables aren't being loaded. Make sure:
1. Your `.env` file exists in the project root
2. Variables are prefixed with `VITE_`
3. You've restarted the dev server after creating/modifying `.env`

### Blank Screen on Load

Check the browser console for errors. The diagnostics panel will show configuration status even if the app fails to fully load.
