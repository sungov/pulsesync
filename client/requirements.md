## Packages
framer-motion | Complex animations and page transitions
recharts | Data visualization for burnout radar and sentiment trends
clsx | Conditional class names utility
tailwind-merge | Merging tailwind classes utility
date-fns | Date formatting and manipulation
lucide-react | Icons (already in base stack, but confirming usage)

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["'Inter', sans-serif"],
  display: ["'Outfit', sans-serif"],
  mono: ["'JetBrains Mono', monospace"],
}

Colors need to follow the professional enterprise aesthetic (Slate/Indigo/Blue).
Authentication uses Replit Auth (useAuth hook).
Role-based access control logic needs to be implemented in the frontend layer (App.tsx or layout).
