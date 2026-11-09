# InstaBiz Morning Setup Guide
**Status:** Next.js + shadcn/ui ✅  
**Today's Goals:** Database, Prisma, Git, Environment, Structure

---

## 1. PostgreSQL Cloud Setup (15 mins)

### Recommended: Supabase (Free tier, great for development)

**Why Supabase:**
- Free tier with 500MB database
- Automatic backups
- Built-in auth (useful later)
- Connection pooling included
- Easy migration to paid tier

**Setup Steps:**

1. **Create Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up with GitHub (easier integration)

2. **Create New Project**
   - Project name: `instabiz-dev`
   - Database password: Generate strong password (save it!)
   - Region: Choose closest to you (for Kampala, choose EU-West or Singapore)
   - Wait 2-3 mins for provisioning

3. **Get Connection String**
   - Go to Project Settings → Database
   - Copy the connection string under "Connection string"
   - Choose **Transaction** mode (not Session)
   - Should look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```

**Alternative: Neon (Also excellent)**
- [neon.tech](https://neon.tech)
- Serverless PostgreSQL
- Better for serverless deployments
- Same setup process

---

## 2. Prisma Configuration (20 mins)

### Install Prisma

```bash
npm install -D prisma
npm install @prisma/client
npx prisma init
```

This creates:
- `prisma/schema.prisma`
- `.env` file

### Configure Prisma Schema

### Update .env file

```env

```

### Run First Migration

```bash
npx prisma migrate dev --name init
```

This will:
- Create all tables in your database
- Generate Prisma Client

### Generate Prisma Client

```bash
npx prisma generate
```

### Create Prisma Client Instance

Create `lib/prisma.ts`:

```typescript
// lib/prisma.ts

```

---

## 3. Git Setup (10 mins)

### Initialize Git (if not done)

```bash
git init
```

### Create .gitignore

Should already exist, but ensure these lines are present:

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
/prisma/migrations/**/*.sql
```

### Create .env.example

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"
DIRECT_URL="postgresql://user:password@host:port/database"

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# App
NODE_ENV="development"
```

### Initial Commit

```bash
git add .
git commit -m "Initial commit: Next.js + shadcn/ui + Prisma setup"
```

### Create GitHub Repository

1. Go to GitHub and create new repository: `instabiz`
2. Don't initialize with README (you already have code)
3. Run these commands:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/instabiz.git
git push -u origin main
```

### Branching Strategy

```bash
# Create develop branch
git checkout -b develop
git push -u origin develop

# Create feature branch for Phase 1
git checkout -b feature/phase1-foundation
```

**Branch Strategy:**
- `main` - Production ready code
- `develop` - Integration branch
- `feature/*` - Individual features
- `module/*` - Trainin g module branches (for students to checkout)

---

## 4. Environment Variables (.env) (5 mins)

### Complete .env Setup

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# ============================================
# AUTHENTICATION (Setup later in Phase 2)
# ============================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="" # Generate with: openssl rand -base64 32

# OAuth Providers (add when ready)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ============================================
# FILE UPLOADS (Setup later in Phase 4)
# ============================================
# Option 1: Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Option 2: AWS S3
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
AWS_BUCKET_NAME=""

# ============================================
# PAYMENTS (Setup later in Phase 5)
# ============================================
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# MTN MoMo Collections
MOMO_TARGET_ENVIRONMENT=""
MOMO_PRIMARY_KEY=""
MOMOUSER_ID=""
MOMOUSER_SECRET=""

# Safaricom Daraja STK Push (use the sandbox base URL while testing)
DARAJA_BASE_URL="https://sandbox.safaricom.co.ke"
DARAJA_CONSUMER_KEY=""
DARAJA_CONSUMER_SECRET=""
DARAJA_SHORTCODE=""
DARAJA_PASSKEY=""
DARAJA_CALLBACK_URL="https://your-domain/api/webhook/daraja"

# Delivery quote signing (at least 32 random characters)
DELIVERY_QUOTE_SECRET=""

# ============================================
# EMAILS (Setup later in Phase 6)
# ============================================
# Resend
RESEND_API_KEY=""
EMAIL_FROM="noreply@instabiz.com"

# ============================================
# APP SETTINGS
# ============================================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="InstaBiz"

# ============================================
# ANALYTICS (Optional - Later)
# ============================================
NEXT_PUBLIC_GA_MEASUREMENT_ID=""
```

### Environment Variable Best Practices

1. **Never commit .env** - Already in .gitignore
2. **Use .env.example** - Template for team members
3. **Prefix client vars** - Use `NEXT_PUBLIC_` for client-side
4. **Separate environments** - `.env.local`, `.env.production`

---

## 5. Project Structure (15 mins)

### Recommended Next.js App Router Structure

```
instabiz/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   └── settings/
│   │   └── layout.tsx
│   ├── (shop)/                   # Public shop routes
│   │   ├── shop/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx
│   │   │       └── [productSlug]/
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   ├── products/
│   │   ├── orders/
│   │   └── webhooks/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── products/
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   └── product-form.tsx
│   ├── shop/
│   │   ├── shop-header.tsx
│   │   └── shop-sidebar.tsx
│   ├── layouts/
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   └── sidebar.tsx
│   └── shared/
│       ├── loading.tsx
│       └── error-boundary.tsx
│
├── lib/                          # Utility libraries
│   ├── prisma.ts                 # Prisma client instance
│   ├── auth.ts                   # Auth utilities (NextAuth config)
│   ├── utils.ts                  # General utilities (cn, etc.)
│   ├── validations/              # Zod schemas
│   │   ├── auth.ts
│   │   ├── product.ts
│   │   └── order.ts
│   └── constants.ts              # App constants
│
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts
│   ├── use-cart.ts
│   └── use-products.ts
│
├── actions/                      # Server actions
│   ├── auth.ts
│   ├── products.ts
│   ├── orders.ts
│   └── shops.ts
│
├── types/                        # TypeScript types
│   ├── index.ts
│   ├── product.ts
│   └── order.ts
│
├── config/                       # Configuration files
│   ├── site.ts                   # Site metadata
│   └── navigation.ts             # Navigation config
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                   # Database seeding script
│
├── public/
│   ├── images/
│   └── icons/
│
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment template
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

### Create Folder Structure

```bash
# Create main directories
mkdir -p app/\(auth\)/login app/\(auth\)/register
mkdir -p app/\(dashboard\)/dashboard/products app/\(dashboard\)/dashboard/orders
mkdir -p app/\(shop\)/shop
mkdir -p app/api/auth app/api/products app/api/orders
mkdir -p components/ui components/auth components/products components/shop components/layouts components/shared
mkdir -p lib/validations
mkdir -p hooks
mkdir -p actions
mkdir -p types
mkdir -p config
```

### Create Essential Files

**lib/utils.ts** (if not exists from shadcn):
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**config/site.ts**:
```typescript
export const siteConfig = {
  name: "InstaBiz",
  description: "Build your online store in minutes",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  links: {
    github: "https://github.com/yourusername/instabiz",
  },
}
```

**types/index.ts**:
```typescript
import { User, Shop, Product, Order } from "@prisma/client"

export type SafeUser = Omit<User, "password">

export type ShopWithOwner = Shop & {
  owner: SafeUser
}

export type ProductWithShop = Product & {
  shop: Shop
}

// Add more as needed
```

---

## 6. Additional Recommendations

### A. Install Essential Dependencies

```bash
# Validation
npm install zod

# Date handling
npm install date-fns

# Forms
npm install react-hook-form @hookform/resolvers

# State management (for cart, etc.)
npm install zustand

# Icons (if not already installed)
npm install lucide-react

# Image optimization
npm install sharp

# Development tools
npm install -D @types/node
```

### B. VS Code Extensions

Install these for better DX:

1. **Prisma** - Syntax highlighting for Prisma
2. **Tailwind CSS IntelliSense** - Autocomplete for Tailwind
3. **ES7+ React/Redux/React-Native snippets** - Code snippets
4. **Error Lens** - Inline error messages
5. **Pretty TypeScript Errors** - Better TS error messages

### C. Prisma Studio

Open Prisma Studio to view your database:

```bash
npx prisma studio
```

Access at: `http://localhost:5555`

### D. Testing Setup (Optional but Recommended)

```bash
# Install testing libraries
npm install -D vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test

# For API testing
npm install -D msw
```

### E. Code Quality Tools

**Create `.prettierrc`:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### F. Create Seed File

**prisma/seed.ts:**
```typescript
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create test user
  const hashedPassword = await hash('password123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'test@instabiz.com' },
    update: {},
    create: {
      email: 'test@instabiz.com',
      name: 'Test User',
      password: hashedPassword,
      role: 'INDIVIDUAL',
    },
  })

  // Create test shop
  const shop = await prisma.shop.upsert({
    where: { slug: 'test-shop' },
    update: {},
    create: {
      name: 'Test Shop',
      slug: 'test-shop',
      description: 'A test shop for development',
      ownerId: user.id,
      status: 'ACTIVE',
    },
  })

  console.log({ user, shop })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Install tsx for running seed:
```bash
npm install -D tsx
```

Add to `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run seed:
```bash
npm run db:seed
```

---

## 7. Verification Checklist

Before moving forward, verify:

- [ ] Supabase/Neon project created ✓
- [ ] DATABASE_URL in .env ✓
- [ ] Prisma schema configured ✓
- [ ] Initial migration run successfully ✓
- [ ] Prisma Client generated ✓
- [ ] Prisma Studio opens and shows tables ✓
- [ ] Git initialized and pushed to GitHub ✓
- [ ] .env.example created ✓
- [ ] Folder structure created ✓
- [ ] Essential dependencies installed ✓
- [ ] Next.js dev server runs (`npm run dev`) ✓

---

## 8. Next Steps (This Afternoon)

### Documentation Tasks (Phase 1 - Module 1)

1. **Record Video:** "Project Setup Walkthrough"
   - Show the entire setup process
   - Explain each decision (why Supabase, why this structure)
   - Demonstrate Prisma Studio
   
2. **Write Guide:** "InstaBiz Setup Guide"
   - Step-by-step text version
   - Include screenshots
   - Add troubleshooting section

3. **Create Exercise:** "Setup Your Own E-commerce Database"
   - Students replicate the setup
   - Provide a different schema (e.g., booking system)
   - Verification checklist

4. **Create Quiz:** "Database & Setup Concepts"
   - Prisma vs other ORMs
   - PostgreSQL vs MySQL
   - Migration best practices

---

## Common Issues & Solutions

### Issue: Prisma Client doesn't regenerate
```bash
npx prisma generate --force
```

### Issue: Migration fails
```bash
# Reset database (CAREFUL: Deletes all data)
npx prisma migrate reset

# Or push schema without migration
npx prisma db push
```

### Issue: Can't connect to database
- Check if DATABASE_URL is correct
- Check if your IP is whitelisted (Supabase allows all by default)
- Try DIRECT_URL for migrations

### Issue: Git conflicts with .env
```bash
# If accidentally committed .env
git rm --cached .env
git commit -m "Remove .env from tracking"
```

---

## Time Estimate

- PostgreSQL setup: 15 mins
- Prisma configuration: 20 mins
- Git setup: 10 mins
- Environment setup: 5 mins
- Project structure: 15 mins
- Additional setup: 15 mins

**Total: ~80 mins (1hr 20mins)**

---

## Quick Start Commands

```bash
# 1. Install Prisma
npm install -D prisma
npm install @prisma/client
npx prisma init

# 2. Update schema.prisma and .env

# 3. Run migration
npx prisma migrate dev --name init

# 4. Open Prisma Studio to verify
npx prisma studio

# 5. Git setup
git init
git add .
git commit -m "Initial commit: Foundation setup"
git remote add origin YOUR_REPO_URL
git push -u origin main

# 6. Create develop branch
git checkout -b develop
git push -u origin develop

# 7. Start development
git checkout -b feature/phase1-foundation
npm run dev
```

---

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Let's build! 🚀**
