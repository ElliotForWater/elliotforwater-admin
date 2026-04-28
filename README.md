# Elliot for Water — Company Admin Panel

A web application that allows company managers to customise how Elliot for Water looks and behaves for their team members.

## What it does

Company managers can:
- Upload a company logo and background image shown in the browser extension
- Set default links that appear in the Links widget for all team members
- Send notifications that appear in the extension's notification bell
- View team members who have signed in to the extension

## Tech stack

- **Vue 3** (Composition API + `<script setup>`)
- **Vuex 4** for state management
- **Supabase** for authentication, database, and file storage
- **Tailwind CSS** for styling
- Deployed to **GitHub Pages** via `gh-pages` branch

---

## Environment variables

Create a `.env.local` file in the project root (never commit this):

```
VUE_APP_SUPABASE_URL=https://your-project.supabase.co
VUE_APP_SUPABASE_ANON_KEY=your-anon-key
VUE_APP_OAUTH_REDIRECT_URL=http://localhost:8080
```

| Variable | Description |
|---|---|
| `VUE_APP_SUPABASE_URL` | Your Supabase project URL |
| `VUE_APP_SUPABASE_ANON_KEY` | Supabase anon/public key (safe to expose) |
| `VUE_APP_OAUTH_REDIRECT_URL` | Where Google OAuth redirects after login. Use `http://localhost:8080` locally, and your GitHub Pages URL in production |

The storage bucket name is hardcoded as `company-assets` in `src/lib/supabase.js`. All uploaded files (logos, backgrounds) go into this bucket.

---

## Supabase setup

The app expects these tables:

### `company_profiles`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `email_domain` | text | e.g. `acme.com` |
| `name` | text | Company display name |
| `manager_email` | text | Email of the authorised admin |

### `company_configs`
| Column | Type | Description |
|---|---|---|
| `company_id` | uuid | FK → `company_profiles.id` |
| `logo_url` | text | Public URL of uploaded logo |
| `bg_image` | text | Public URL of uploaded background |
| `default_links` | jsonb | Array of `{ text, link }` objects |
| `notifications` | jsonb | `{ message, active, created_at, created_by }` |

### `profiles` (optional, for Team section)
Populated by the extension when users sign in. Columns: `id`, `email`, `full_name`, `created_at`.

---

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run serve

# Build for production
npm run build
```

Add your `.env.local` file before running.

In Supabase → Authentication → URL Configuration, add these to **Redirect URLs**:
- `http://localhost:8080`
- `https://your-org.github.io/elliot-admin/`

---

## Development workflow

1. Run `npm run serve` — app is at `http://localhost:8080`
2. Sign in with your company Google account
3. Changes hot-reload automatically
4. To deploy: push to `main`, GitHub Actions publishes to `gh-pages`

### File structure

```
src/
  components/
    sections/       # One component per admin section (Branding, Links, etc.)
    ui/             # Reusable UI primitives (Card, UploadArea, StatusBar)
  composables/      # Reusable Vue logic (useSaveOperation)
  services/         # Business logic utilities (uploadService)
  lib/
    supabase.js     # Supabase client + BUCKET constant
  store/
    index.js        # Vuex store: auth state, company data, status messages
  views/
    LoginView.vue   # Login + not-registered + not-authorized screens
    AdminView.vue   # Main admin layout
  helpers.js        # formatDate, getInitials, getDomain
```
