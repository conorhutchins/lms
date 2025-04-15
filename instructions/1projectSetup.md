# Project Setup

## 1. Create Next.js App
```bash
npx create-next-app@latest --typescript last-man-standing
```

## 2. Install Dependencies
Core dependencies likely include:
```bash
cd last-man-standing
npm install @supabase/ssr @supabase/supabase-js # Supabase
npm install @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-navigation-menu @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-toast # Radix UI components
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate lucide-react # UI Utilities
npm install tailwindcss postcss autoprefixer # Tailwind CSS

# Dependencies likely used on other branches (e.g., for payments)
npm install stripe @stripe/stripe-js @types/stripe

# Add other specific dependencies like axios, pg if still used
```

## 3. Initialize Tailwind CSS
```bash
npx tailwindcss init -p
```

## 4. Project Structure
```
last-man-standing/
├── components/             # Reusable UI components (e.g., layout/, auth/, home/)
├── lib/                    # Core logic, types, hooks, utils
│   ├── context/            # React Context (e.g., SupabaseContext.ts)
│   ├── db/                 # Database related (e.g., services/)
│   │   └── services/
│   │       ├── competition/  # Service logic per feature
│   │       │   └── index.ts
│   │       └── ...
│   ├── hooks/              # Custom React Hooks
│   │   ├── useAuthActions/ # Hooks per feature/domain
│   │   │   └── index.ts
│   │   └── ...
│   ├── types/              # TypeScript types (e.g., supabase.ts, service.ts)
│   │   └── supabase.ts
│   └── utils/              # Utility functions
│       └── supabaseServerHelpers/ # e.g., Cookie helpers
│           └── index.ts
├── pages/                  # Next.js pages and API routes
│   ├── index.tsx
│   ├── hub.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   └── api/
│       ├── auth/
│       │   └── callback/     # Supabase auth callback route
│       │       └── route.ts
│       ├── competitions/
│       │   └── index.ts
│       └── ...
├── public/                 # Static assets
├── scripts/                # Standalone scripts (e.g., data population)
│   ├── env-setup/
│   │   └── index.ts
│   └── ...
├── src/                    # Optional src directory (contains lib/supabase helpers)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   └── ...
├── styles/                 # Global styles
│   └── globals.css
├── .env.local              # Environment variables (ignored by git)
├── middleware.ts           # Next.js middleware (root or src/)
├── next.config.mjs         # Next.js config
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```


