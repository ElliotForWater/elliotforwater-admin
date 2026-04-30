# Elliot for Water — Company Admin Panel

Am admin interface that allows company managers to customise how Elliot for Water looks and behaves for their team members.


## Tech stack

- **Vue 3** (Composition API + `<script setup>`)
- **Vuex 4** for state management
- **Supabase** for authentication, database, and file storage
- **Tailwind CSS** for styling
- Deployed to **Netlify** via `main` branch

---

## 📚 Documentation

This project includes comprehensive documentation:

**[📖 View All Documentation](./docs/)**

### Key Documentation:
- **[🏗️ Tech Stack Overview](./docs/tech-stack.md)** - Learn about the technologies and libraries used
- **[🔧 Git Basics for AI Users](./docs/git-basics.md)** - Understanding Git and working with GitHub
- **[💻 Development Setup](./docs/development.md)** - How to set up and run the project locally
- **[🚀 Deployment Guide](./docs/deployment.md)** - How to deploy to Netlify

**Quick Start**: Read the [Tech Stack Overview](./docs/tech-stack.md) first, then follow the [Development Setup](./docs/development.md) guide.

---

## Environment variables

Create a `.env` file in the project root and copy the content of `.env.example`:

| Variable | Description |
|---|---|
| `VUE_APP_SUPABASE_URL` | Your Supabase project URL |
| `VUE_APP_SUPABASE_ANON_KEY` | Supabase anon/public key (safe to expose) |
| `VUE_APP_OAUTH_REDIRECT_URL` | Where Google OAuth redirects after login. Use `http://localhost:8080` locally, and your GitHub Pages URL in production |

The storage bucket name is hardcoded as `company-assets` in `src/lib/supabase.js`. All uploaded files (logos, backgrounds) go into this bucket.

---

## Quick Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run serve

# Build for production
npm run build
```

In Supabase → Authentication → URL Configuration, add these to **Redirect URLs**:
- `http://localhost:8080`
- `https://your-org.github.io/elliot-admin/`

---
