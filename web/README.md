# TaskZing Website 1

A production-ready Next.js marketplace website for connecting clients with skilled professionals.

## Tech Stack

- **Next.js 14+** with App Router (TypeScript)
- **Tailwind CSS** for styling
- **Hybrid Rendering**:
  - SSG for landing & marketing pages
  - SSR for listings, categories, and profiles
  - SPA (CSR) for authenticated dashboard
- **Mock Authentication** (ready for real auth integration)

## Features

- ✅ Complete page structure (20+ pages)
- ✅ Responsive design (mobile-first)
- ✅ SEO-optimized with metadata, sitemap, and robots.txt
- ✅ Reusable component library
- ✅ Mock data system ready for backend integration
- ✅ Loading and error states
- ✅ Protected routes with middleware
- ✅ Accessible UI with ARIA labels

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the website directory:
```bash
cd website
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
website/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Protected dashboard group
│   │   ├── dashboard/
│   │   ├── post-task/
│   │   ├── browse-tasks/
│   │   ├── proposals/
│   │   ├── messages/
│   │   ├── orders/
│   │   ├── wallet/
│   │   └── settings/
│   ├── (public)/                 # Public pages
│   │   ├── page.tsx              # Home (SSG)
│   │   ├── categories/
│   │   ├── category/[slug]/
│   │   ├── task/[slug]/
│   │   ├── freelancer/[slug]/
│   │   ├── about/
│   │   ├── how-it-works/
│   │   ├── pricing/
│   │   └── blog/
│   ├── api/                      # API routes (mock data)
│   ├── layout.tsx                # Root layout
│   └── loading.tsx               # Global loading
├── components/
│   ├── layout/                   # Header, Footer, Navbar, DashboardLayout
│   ├── ui/                       # Reusable UI components
│   ├── dashboard/                # Dashboard-specific
│   ├── task/                     # Task-related
│   └── shared/                   # Shared utilities
├── lib/
│   ├── mock-data/                # Mock data generators
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript types
│   └── auth/                     # Auth utilities (mock)
├── middleware.ts                 # Route protection
└── public/                       # Static assets
```

## Pages

### Public Pages (SSG/SSR)
- **Home** (`/`) - Landing page with hero, categories, featured tasks
- **Categories** (`/categories`) - Browse all categories
- **Category Detail** (`/category/[slug]`) - Category with tasks (SSR)
- **Task Detail** (`/task/[slug]`) - Full task details (SSR)
- **Freelancer Profile** (`/freelancer/[slug]`) - Provider profile (SSR)
- **About** (`/about`) - Company information
- **How It Works** (`/how-it-works`) - Step-by-step guide
- **Pricing** (`/pricing`) - Pricing plans
- **Blog** (`/blog`) - Blog listing

### Authentication Pages
- **Login** (`/login`) - Sign in
- **Signup** (`/signup`) - Create account
- **Forgot Password** (`/forgot-password`) - Password reset

### Dashboard Pages (CSR/SPA)
- **Dashboard** (`/dashboard`) - Overview with stats
- **Post Task** (`/dashboard/post-task`) - Create task listing
- **Browse Tasks** (`/dashboard/browse-tasks`) - Search and filter tasks
- **Proposals** (`/dashboard/proposals`) - Manage proposals
- **Messages** (`/dashboard/messages`) - Chat interface
- **Orders** (`/dashboard/orders`) - Order management
- **Wallet** (`/dashboard/wallet`) - Payment and transactions
- **Settings** (`/dashboard/settings`) - Account settings

## Mock Data

The application uses mock data located in `lib/mock-data/`. To integrate with a real backend:

1. Replace API routes in `app/api/` with real API calls
2. Update `lib/auth/mock.ts` with real authentication
3. Replace mock data imports with API calls

## Authentication

Currently uses mock authentication. To implement real auth:

1. Replace `lib/auth/mock.ts` with your auth provider (NextAuth.js, Auth0, etc.)
2. Update `middleware.ts` to use real auth checks
3. Update auth pages to use real auth functions

## SEO

- Dynamic metadata on all pages
- Open Graph tags
- Twitter cards
- Sitemap generation (`/sitemap.xml`)
- Robots.txt (`/robots.txt`)
- Structured data ready for JSON-LD

## Styling

- Tailwind CSS with custom color scheme
- Responsive breakpoints (mobile-first)
- Consistent design system
- Accessible color contrasts

## Development

### Code Style
- TypeScript strict mode
- ESLint configuration
- Consistent component structure

### Adding New Pages
1. Create page file in appropriate route group
2. Add metadata export
3. Create loading.tsx and error.tsx if needed
4. Update sitemap if public page

### Adding New Components
1. Create component in appropriate folder
2. Export from index.ts
3. Follow existing component patterns
4. Add TypeScript types

## Environment Variables

Create a `.env.local` file for environment-specific variables.

**Backend API:** defaults to the same Railway URL as the Flutter app (`taskzing-backend-production.up.railway.app`). Override only if you point at another environment:

```env
NEXT_PUBLIC_API_BASE_URL=https://taskzing-backend-production.up.railway.app
```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Deploy automatically

### Other Platforms
1. Build the project: `npm run build`
2. Start production server: `npm start`
3. Configure environment variables

## License

This project is part of the TaskZing marketplace platform.

## Support

For issues or questions, please contact the development team.

