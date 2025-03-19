# Project Setup

## 1. Create Next.js App
```bash
npx create-next-app@latest --typescript last-man-standing
```

## 2. Install Dependencies
```bash
cd last-man-standing
npm install tailwindcss postcss autoprefixer next-auth stripe @stripe/stripe-js @types/stripe
npm install @headlessui/react @heroicons/react firebase # optional for notifications or UI
```

## 3. Initialize Tailwind CSS
```bash
npx tailwindcss init -p
```

## 4. Project Structure
```
last-man-standing/
├── pages/          # Next.js pages
│   ├── index.tsx
│   ├── dashboard.tsx
│   └── api/
├── components/     # Reusable UI components
│   ├── Navbar.tsx
│   └── TeamSelectionModal.tsx
├── lib/           # Utility functions
│   ├── auth.ts
│   ├── stripe.ts
│   └── apiHelpers.ts
└── styles/        # Global styles
    └── globals.css
```


