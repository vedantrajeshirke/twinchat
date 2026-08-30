# TwinChat

> **Find your people. Chat about what you love.**

An interest-based social messaging platform. People discover each other (and groups) through
shared interests, connect, and chat in real time.

Built to the specification in [`PROJECT_PLAN.md`](PROJECT_PLAN.md). The REST and Socket.IO
interface is documented in [`API_CONTRACT.md`](API_CONTRACT.md).

---

## Quick start

You need **Node 20+**. Nothing else: no database or image host to set up first.

```bash
# 1. API  (terminal 1)
cd server
npm install
cp .env.example .env
npm run dev:demo          # boots an in-process MongoDB and seeds a demo community

# 2. Web  (terminal 2)
cd client
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173** and sign up.

### Demo data

`npm run dev:demo` seeds a small fictional community so the UI has something to show while you
build. **Every demo account uses the password `demo1234`**, with usernames `ada`, `milo`, `priya`,
`jonas`, `nia`, `tomas`, `sana` and `kenji`. Log in as any of them to edit their profiles, or open
two browsers as different users to watch messages, typing indicators and presence move live.
`ada` has the most going on: 3 chats, 2 pending requests, 3 groups.

Demo accounts all use `@twinchat.dev` emails, which no real signup can hold, so they are easy to
tell apart and to remove:

| Command | Effect |
|---|---|
| `npm run dev:demo` | Seed the demo community into the in-memory database |
| `npm run seed:demo:remote` | Seed it into the real database in `MONGO_URI` (wipes everything first) |
| `npm run remove:demo` | Delete every demo account and its groups, threads and messages, leaving real accounts untouched |

Keep the demo data out of any database real people will use: it exists to make development
pleasant, not to pad out a live app.

### Ports

| Service | Port |
|---|---|
| Web (Vite) | 5173 |
| API + Socket.IO | 5050 |

Port **5050**, not 5000, because macOS Control Center (AirPlay Receiver) already listens on 5000.

---

## Zero-config development

Both external services are optional in development, so you can build without signing up for
anything. Each falls back automatically and switches over the moment you add real credentials.

| Service | Without credentials | With credentials |
|---|---|---|
| **MongoDB** | In-process `mongodb-memory-server`, wiped on restart | Set `MONGO_URI` for MongoDB Atlas or any instance |
| **Cloudinary** | Files written to `server/uploads/`, served from the API | Set the three `CLOUDINARY_*` vars and uploads go to Cloudinary |

`GET /api/health` reports which mode each one is in.

---

## Scripts

**server/**

| Command | What it does |
|---|---|
| `npm run dev` | Start with file watching |
| `npm run dev:demo` | Start, wipe the database, and seed the demo community |
| `npm start` | Production start |
| `npm run seed` | Upsert the interest list (safe to re-run) |
| `npm run seed:demo:remote` | Seed the demo community into a real `MONGO_URI` (wipes it first) |
| `npm run remove:demo` | Remove the demo community, keeping real accounts |
| `npm run e2e` | 37-check end-to-end API suite against a running server (creates a few test accounts as it goes) |

**client/**

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Project structure

```
├── client/                  React + Vite + Tailwind v4
│   └── src/
│       ├── components/      ui/ primitives, chat/, discovery/, group/
│       ├── pages/           Landing, Login, Signup, Home, Discover, Requests,
│       │                    Profile, PublicProfile, GroupPage, Settings
│       ├── context/         Auth, Theme, Socket, Chat
│       ├── hooks/           useMessages, useInterests, useConnect, useUsernameCheck
│       ├── services/api.js  axios instance, token handling, error shaping
│       └── styles/          global.css, the whole theme system
│
└── server/                  Node + Express + Socket.IO
    ├── config/              env, db (with fallback), cloudinary
    ├── models/              User, Interest, ConnectionRequest, Group,
    │                        Conversation, Message
    ├── controllers/         auth, user, connection, group, conversation
    ├── routes/              one router per resource, mounted in routes/index.js
    ├── middleware/          auth (JWT), validate (Zod), upload (multer), errors
    ├── socket/              handshake auth, rooms, presence, typing
    └── utils/               serializers, permissions, storage, seeds
```

---

## How the core rules are enforced

Every rule below is checked **server-side on every request**, not just in the UI.
`npm run e2e` asserts each one.

| Rule | Where |
|---|---|
| Direct chat requires an accepted friendship, both ways | `utils/permissions.js` |
| Group chat is open to any member, friendship irrelevant | `utils/permissions.js` |
| Unfriending immediately revokes messaging | `utils/permissions.js` |
| Email never appears in a public response | `utils/serialize.js`: `publicUser()` |
| Password is `select: false` and never serialized | `models/User.js` |
| Attachments capped at 1MB, MIME whitelisted | `middleware/upload.js` |
| Only the group owner can edit or delete a group | `controllers/group.controller.js` |
| At least 3 interests, validated against the DB list | `controllers/auth.controller.js` |
| Sockets authenticate with the same JWT as REST | `socket/index.js` |

---

## Theming

One CSS variable block per theme in [`client/src/styles/global.css`](client/src/styles/global.css),
selected by `data-theme` and `data-mode` on `<html>`. `ThemeContext` sets those attributes, so a
switch repaints instantly with no reload, and the choice is persisted to `User.theme` / `User.mode`
so it follows the account across devices.

Components never hardcode a colour. They use Tailwind tokens mapped to the variables
(`bg-surface`, `text-muted`, `border-line`, …). **Adding a theme is one variable block plus one
entry in `client/src/utils/themes.js`.** v1 ships Ocean in light and dark.

## Editing the interest list

Interests live in the `Interest` collection, so the list changes without a code change. Edit the
rows directly, or amend `server/utils/interestSeedData.js` and re-run `npm run seed` (it upserts and
never deletes rows you added).

---

## Deployment

The Socket.IO server holds a persistent connection, so it **cannot** go on Vercel or Netlify.

| Piece | Where | Notes |
|---|---|---|
| Frontend | Vercel / Netlify | Build `npm run build`, publish `dist/`. SPA rewrite to `/index.html` is in `client/vercel.json` and `client/netlify.toml`. |
| Backend | Render | `render.yaml` included. Free instances sleep after ~15 min; the app shows a "Waking the server up…" state instead of an error. |
| Database | MongoDB Atlas M0 | Set `MONGO_URI`. |
| Images | Cloudinary | Set the three `CLOUDINARY_*` vars. |

Production requires `MONGO_URI` and a real `JWT_SECRET`, the server refuses to boot without
them. Set `CLIENT_URL` to your deployed frontend origin (comma-separated for several).

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
```

---

## Status against the plan's Definition of Done

- [x] Sign up (hashed password, ≥3 interests, optional pic/bio) and log in
- [x] View/edit own profile (pic, bio, name, interests) and log out
- [x] Search people & groups, filtered by interest, with shared-interest indicator
- [x] Send/accept/decline connection requests and unfriend
- [x] Friends chat 1-on-1 in real time; reply to messages
- [x] Attachments (image/video/document, ≤1MB) in direct and group chats, enforced both sides
- [x] Create a group, join/leave, view members, open member profiles
- [x] Any group member can chat; all members see messages
- [x] Owner-only group editing
- [x] Colour theme selection, persisted across devices
- [x] Empty and loading states throughout
- [ ] Deployed. Configs are included; hosting accounts are yours to create

Deferred by the plan itself: forgot-password and email verification (§10), blocking and reporting
(schema room left via `User.blockedUsers`), multiple group admins.
