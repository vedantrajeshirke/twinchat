# TwinChat — Project Plan

> **Tagline:** *Find your people. Chat about what you love.*
>
> **Purpose of this document:** A complete, build-ready specification for TwinChat, an interest-based social messaging platform. It is written to be handed to Claude Code (or any developer) and worked through step by step. Each section describes *what* to build, *how the page/feature should be structured*, and the *data* behind it.

---

## How to build this with Claude Code

This document is the source of truth. Suggested workflow:

1. **Save this file as `PROJECT_PLAN.md` in an empty project folder**, then open Claude Code in that folder.
2. **Don't ask Claude Code to "build the whole app" in one go.** Work through the milestones in **Section 4** one at a time — e.g. start with *"Read PROJECT_PLAN.md. Let's do Milestone 1: project setup. Scaffold the client and server per Sections 1, 2, and 12."*
3. After each milestone, **run it and test it** before moving to the next. Commit to git between milestones so you can roll back.
4. When a section is relevant, point Claude Code at it explicitly (e.g. *"Build the Message model and chat window per Sections 3.6, 5.4, and the Ocean palette in 7.4"*).
5. **Fill in the blanks Claude Code will ask about** (or decide up front): your MongoDB Atlas connection string, Cloudinary keys, and JWT secret — see Section 12. Create the free accounts first (MongoDB Atlas, Cloudinary) so the keys are ready.
6. Ask Claude Code to **generate the REST API + Socket.IO event contract** as its own step before wiring the frontend to the backend — the plan defines the data and behavior but not every endpoint signature, so let it propose those and review them.

**Will Claude Code understand this?** Yes — it's structured, unambiguous, and specifies the stack, data models, page behavior, and exact colors. The plan deliberately leaves a few low-level details (precise endpoint signatures, folder-level file names, minor library choices) for Claude Code to decide during implementation; that's normal and fine. The clearer your per-milestone prompts, the better the output. Build incrementally, test as you go, and treat this doc as the spec you both refer back to.

---

## 0. Project Summary

**TwinChat** is a web platform where people discover and connect with others (and groups) based on shared interests. New users create a profile, select interests, and can then search for people and interest-based groups. They send connection requests to individuals (chat unlocks once accepted) and join groups (any member can chat in a group regardless of connection status). Core experience is a clean, WhatsApp-style real-time messaging interface.

**Design principle:** Clean and neat. Not too flashy, not too basic. Consistent spacing, restrained color, good typography, obvious affordances.

---

## 1. Tech Stack

**Recommendation: Stick with MERN.** It fits the requirement perfectly (real-time chat, JSON data, one language across the stack) and every piece has a genuinely free tier. Below is the exact stack, all $0.

| Layer | Choice | Why | Free? |
|---|---|---|---|
| Frontend | **React (Vite)** | Fast dev server, modern tooling (avoid Create React App — deprecated) | Yes |
| Styling | **Tailwind CSS** + CSS variables | Fast, clean, and CSS variables make the color-theme feature trivial | Yes |
| Routing | **React Router** | Standard SPA routing | Yes |
| State | **React Context** (+ optionally Zustand) | Auth, theme, and socket contexts; Zustand only if state grows | Yes |
| Backend | **Node.js + Express** | Standard, well-documented REST API | Yes |
| Real-time | **Socket.IO** | Bidirectional messaging, typing indicators, presence | Yes |
| Database | **MongoDB Atlas (free M0 tier, 512MB)** | Managed, no local setup needed | Yes |
| ODM | **Mongoose** | Schemas, validation, relationships | Yes |
| Auth | **JWT** (jsonwebtoken) + **bcrypt** | Stateless auth that plays well with Socket.IO | Yes |
| Image storage | **Cloudinary (free tier)** | Do NOT store images in MongoDB. Free tier is generous | Yes |
| Validation | **Zod** or **express-validator** | Server-side input validation | Yes |

### Hosting (all free, no credit card where noted)
- **Frontend:** Vercel or Netlify (free, static/SPA hosting).
- **Backend:** **Render free tier** — supports WebSockets, deploys from GitHub, no credit card required. Note: free instances **sleep after ~15 min of inactivity** and take ~30–60s to wake (cold start). Acceptable for a personal project. (Alternatives: Railway with trial credit, Fly.io, Koyeb/Northflank if you want always-on but those ask for a card.)
- **Database:** MongoDB Atlas M0 (free forever, 512MB).
- **Images:** Cloudinary free tier.

> ⚠️ **Do not deploy the Socket.IO backend to Vercel/Netlify** — they are serverless and can't hold a persistent WebSocket connection. Backend goes to Render (or similar). Frontend can go to Vercel/Netlify.

---

## 2. Project Structure

```
project-root/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI (Sidebar, ChatWindow, ProfileCard, etc.)
│   │   ├── pages/              # Landing, Login, Signup, Home, Profile, etc.
│   │   ├── context/            # AuthContext, ThemeContext, SocketContext
│   │   ├── hooks/              # useAuth, useSocket, useFetch
│   │   ├── services/           # API calls (axios instance)
│   │   ├── utils/              # helpers, constants
│   │   ├── styles/             # global.css with CSS variables / theme definitions
│   │   └── App.jsx
│   └── ...
├── server/                     # Node + Express backend
│   ├── config/                 # db connection, cloudinary config
│   ├── models/                 # Mongoose schemas
│   ├── controllers/            # Route logic
│   ├── routes/                 # Express routes
│   ├── middleware/             # auth (JWT verify), error handler, upload
│   ├── socket/                 # Socket.IO event handlers
│   ├── utils/                  # helpers
│   └── server.js               # entry point
└── README.md
```

---

## 3. Data Models (Mongoose Schemas)

Plan these before writing any UI — everything depends on them.

### 3.1 User
```
User {
  _id
  firstName        String, required
  lastName         String, required
  username         String, required, unique, indexed
  email            String, required, unique   // PRIVATE — never returned on public profile
  password         String, required           // bcrypt hash, never returned in any response
  bio              String, optional
  profilePicture   String, optional           // Cloudinary URL
  interests        [String]                   // references Interest names/ids; min 3 required
  friends          [ObjectId → User]          // accepted mutual connections
  groups           [ObjectId → Group]
  theme            String, default: "ocean"   // color theme preference (persists across devices)
  mode             String, default: "light"   // "light" | "dark"
  createdAt, updatedAt
}
```

### 3.2 Interest
Stored in DB so the list is **editable without code changes** (per requirement).
```
Interest {
  _id
  name             String, required, unique   // e.g. "Technology"
  category         String, optional           // optional grouping e.g. "Sports"
  isActive         Boolean, default: true
}
```
> Seed this collection with the starter list in Section 11. Editing the list later = editing DB rows (or a small admin seed script).

### 3.3 ConnectionRequest
```
ConnectionRequest {
  _id
  from             ObjectId → User
  to               ObjectId → User
  status           String enum: ["pending", "accepted", "declined"], default "pending"
  createdAt
}
```
> On "accepted": add each user to the other's `friends` array, then keep or delete the request record (keep for history is fine).

### 3.4 Group
```
Group {
  _id
  name             String, required
  description      String, optional
  mainInterest     String, required            // the group's primary interest
  groupPicture     String, optional            // Cloudinary URL
  owner            ObjectId → User             // creator; only owner can edit group info
  members          [ObjectId → User]
  createdAt, updatedAt
}
```
> **Roles:** `owner` is the single editor/admin. Everyone else is a member. (Extendable to multiple admins later.)

### 3.5 Conversation
Represents a chat thread — either 1-on-1 (between two friends) or a group.
```
Conversation {
  _id
  type             String enum: ["direct", "group"]
  participants     [ObjectId → User]           // for direct: 2 users; for group: mirror of group members
  group            ObjectId → Group, optional  // set only when type === "group"
  lastMessage      ObjectId → Message, optional // for conversation-list preview
  updatedAt                                     // sort conversation list by this
}
```

### 3.6 Message
```
Message {
  _id
  conversation     ObjectId → Conversation
  sender           ObjectId → User
  content          String, optional             // text; optional when an attachment is present
  attachment       {                            // optional — media/document sharing (≤ 1MB)
    url            String                        // Cloudinary URL
    type           String enum: ["image", "video", "document"]
    fileName       String                        // original name, for documents
    mimeType       String                        // e.g. "image/png", "application/pdf"
    size           Number                        // bytes — enforce ≤ 1,048,576
  } | null
  replyTo          ObjectId → Message, optional  // reply-to-a-message feature
  readBy           [ObjectId → User]             // for read receipts / unread counts
  createdAt
}
```
> A message must have **either** `content` **or** `attachment` (or both). Validate that at least one is present.

---

## 4. Build Order (Milestones)

Work through these in order. Each milestone should be independently testable.

1. **Project setup** — scaffold client (Vite) + server (Express), connect MongoDB Atlas, set up folder structure, env variables, base Tailwind + theme CSS variables.
2. **Auth** — Signup (with hashing, interest selection, optional pic/bio), Login (JWT), protected routes, auth middleware. Seed Interest collection.
3. **Profiles** — Own profile page (view/edit pic, bio, logout), public profile view.
4. **Discovery/Search** — Search people & groups by name/username, filter by interests, shared-interest indicator.
5. **Connections** — Send/receive/accept/decline requests, friends list, unfriend.
6. **Groups** — Create group, join/leave, group info + member list, owner-only editing.
7. **Real-time messaging** — Socket.IO setup, 1-on-1 chat, group chat, message persistence, conversation list, reply-to-message, media/document sharing (≤1MB).
8. **Polish** — Empty states, loading states, notifications/requests badge, color themes in settings, suggested people/groups.
9. **Deploy** — Cloudinary, Render (backend), Vercel/Netlify (frontend), MongoDB Atlas.

---

## 5. Page-by-Page Specification

### 5.1 Landing Page (`/`)
**Purpose:** First impression + entry point.

**Layout:**
- Centered logo + platform name (**TwinChat**).
- Tagline: **"Find your people. Chat about what you love."**
- Two clear buttons: **Log In** and **Sign Up**.
- Optional subtle hero illustration or background — keep it understated.

**Behavior:**
- If a valid session/JWT exists → auto-redirect to Home (`/home`).
- "Log In" → `/login`; "Sign Up" → `/signup`.

---

### 5.2 Sign Up (`/signup`)
**Purpose:** Create account + profile.

**Fields (in order):**
- First Name (required)
- Last Name (required)
- Username (required, **unique** — live availability check if possible)
- Email (required, unique — **private**, never displayed on profile)
- Password (required)
- Confirm Password (required — must match)
- **Interests** — multi-select from the list (chips/checkboxes). **Require at least 3.**
- Profile Picture (optional — upload to Cloudinary)
- Bio (optional, short)

**Rules:**
- Hash password with **bcrypt** before saving.
- Validate: password match, password strength, email format, username uniqueness — on both client and server.
- On success → create profile → issue JWT → redirect to Home.

**UX notes:**
- Consider a short 2-step flow: (1) credentials, (2) interests + optional pic/bio. Reduces form overwhelm.
- Show clear inline errors.

---

### 5.3 Log In (`/login`)
**Fields:** Email **or** Username + Password.
**Behavior:**
- Verify bcrypt hash → issue JWT → redirect to Home.
- Clear error message on failure (don't reveal which field was wrong, for security).
- "Forgot password?" link (see Suggestions §10 — can be a later milestone).

---

### 5.4 Home Page (`/home`) — Main App Shell
**Purpose:** The core app. Three-region layout, WhatsApp-style.

```
┌──────┬─────────────────────┬───────────────────────────────┐
│ Icon │  Conversation list   │        Chat window            │
│ rail │  (+ search bar)      │                               │
│      │                      │                               │
└──────┴─────────────────────┴───────────────────────────────┘
```

**A) Left icon rail (narrow):**
- **Search** — opens app-wide discovery (find people/groups). *(Moved here from the profile page per updated decision.)*
- **Connection Requests / Notifications** — with an unread badge count.
- **Profile** — go to own profile.
- **Settings** — includes theme selection.
- **(bottom) Logout** shortcut optional (also lives in profile/settings).

**B) Middle column — Conversation list:**
- **Search bar on top** — filters *existing* conversations (people + groups you're already chatting with) by name.
- List of conversations sorted by most recent activity (`Conversation.updatedAt`). Each row:
  - Avatar (person pic or group pic)
  - Name (person's name or group name)
  - Last message preview + timestamp
  - Unread count badge (optional, from `readBy`)
- Clicking a row loads it in the chat window.

**C) Right column — Chat window:**
- **Header:** avatar + name of the person/group. Clicking it opens their profile / group info panel.
- **Message area:** messages in bubbles (own messages aligned right, others left). Group messages show sender name.
- **Reply-to:** each message has a "reply" action; when replying, show a quoted preview of the original message above the input, and render replied messages with the quoted snippet.
- **Media/document sharing:** an **attach** button (paperclip) in the input bar lets the user pick an image, video, or document from their device (**max 1MB**). Show a preview/chip before sending; on send, upload to Cloudinary and attach the URL to the message.
  - Images/videos render inline as thumbnails/previews in the bubble (click to expand).
  - Documents render as a file card (icon + filename + size) with a download link.
  - Available in both direct and group chats.
- **Input bar:** attach button + text field + send button. Enter to send.
- **Live features:** typing indicator, online/offline presence, instant delivery (all via Socket.IO).
- **Empty state:** when no conversation is selected → friendly placeholder ("Select a chat to start messaging").

---

### 5.5 App-Wide Search / Discovery
**Purpose:** Find new people and groups to connect with.

**Layout:**
- Search input at top.
- Tabs or toggle: **People** | **Groups**.
- **Interest filter** — multi-select chips to filter results by interest(s).
- Results list:
  - **People result:** avatar, name, username, a few interests, **shared-interest indicator** ("4 interests in common"), and an action button: **Connect** → **Pending** → (once accepted) **Message**.
  - **Group result:** group pic, name, main interest, member count, **Join** button.

**Search logic:**
- People: match by name / username, optionally filtered by selected interests.
- Groups: match by group name, optionally filtered by main interest.

---

### 5.6 Public Profile (viewing another user) (`/user/:username`)
**Shows:**
- Profile picture, username, first + last name, bio.
- Interests (as chips).
- Groups they belong to.
- **Shared-interest indicator.**
- Action button:
  - Not connected → **Send Connect Request** (→ **Pending** after sending).
  - Connected → **Message** + **Unfriend** option.
- **Email is never shown here.**

---

### 5.7 Own Profile Page (`/profile`)
**Purpose:** View and edit own profile.

**Shows/edits:**
- Profile picture — change (upload new to Cloudinary).
- Bio — edit.
- (Optionally allow editing name/username — see Suggestions.)
- Interests — display; optionally allow editing.
- **Friends list** — clickable, each opens that friend's profile; each has an **Unfriend** option.
- **Log Out** button.
- **Email is displayed here privately (only to the owner)** since it's the account owner's own page — but never on public profiles.

---

### 5.8 Connection Requests / Notifications (`/requests`)
**Purpose:** Manage incoming (and optionally outgoing) requests. *(This was missing in the original idea — now included per updated decision.)*

**Layout:**
- **Incoming requests:** list of users who sent you a request, each with **Accept** / **Decline**.
- **Sent requests (optional):** list of pending requests you sent, each with **Cancel**.
- On **Accept** → both users become friends, a direct conversation becomes available, and (optionally) a notification is fired.
- Badge count of pending incoming requests shows on the sidebar icon.

---

### 5.9 Group Info Panel / Page
**Opened by:** clicking a group name/icon (in chat header or search).

**Shows:**
- Group picture, name, main interest, description.
- Member count + member list (avatars + names).
- Clicking a member → opens their profile.
- **Join Group** (if not a member) / **Leave Group** (if a member).
- If current user is the **owner** → **Edit Group** (name, pic, main interest, description) and manage (later: remove members).

---

### 5.10 Create Group (`/groups/create` or modal)
**Fields:**
- Group picture (upload to Cloudinary)
- Group name (required)
- Main interest (required — pick from interest list)
- Description (optional)

**Behavior:**
- Creator becomes **owner** and first member.
- A group-type Conversation is created.
- Redirect to the new group's chat/info.

---

### 5.11 Settings (`/settings`)
- **Color theme selection** (your signature feature) — see §7.
- Change password.
- Notification preferences (optional).
- Privacy note / account info.
- Logout.

---

## 6. Feature Rules & Logic

### Messaging permissions (per your decision)
- **Direct chat:** only allowed between **accepted friends**. Two non-friends cannot DM.
- **Group chat:** **any member** can post in the group, and **all members see and can respond** — even if two members aren't connected as friends.
- **Reply-to-message:** available in both direct and group chats (via `Message.replyTo`).
- **Media/document sharing:** users can attach an image, video, or document from their device to any message, in both direct and group chats. **Hard limit: 1MB per file** — enforced on both client (reject before upload) and server (reject before storing). Allowed types: common image formats (png/jpg/gif/webp), short video (mp4/webm), and documents (pdf/docx/txt). Files upload to Cloudinary; the message stores only the URL + metadata.

### Connection flow
1. User A sends request to User B → `ConnectionRequest {status: pending}`.
2. B sees it in Requests → Accept/Decline.
3. Accept → both added to each other's `friends`, direct conversation enabled.
4. Either can **Unfriend** later → remove from both `friends` arrays (optionally hide/close the conversation).

### Group flow
1. Any user creates a group → becomes owner + member.
2. Others discover via search → **Join** → added to `members` and the group Conversation participants.
3. Members can **Leave**. Owner can **Edit** group info (owner-only).

---

## 7. Visual Design System (Branding, Logo, Themes)

### 7.1 Brand
- **Name:** TwinChat. **Tagline:** *Find your people. Chat about what you love.*
- **Primary theme (default & ship-with):** **Ocean** — a cool blue + teal palette. This is the chosen look for v1. Additional themes (below) can be added later; the theme *system* should be built from the start, but Ocean is the default.
- **Typography:** a friendly, rounded sans-serif. Recommended: **Poppins**, **Nunito**, or **Quicksand** for the logo/headings; a clean readable sans (**Inter** or system font) for body/UI text. Two weights: 400 regular, 500 medium.
- **Tone:** clean and neat, not flashy. Color is used sparingly — reserved for actions, the user's own message bubbles, active states, and accents. Generous whitespace, hairline borders, soft rounded corners.

### 7.2 Logo
The mark is a **split two-tone speech bubble** with two small white dots ("eyes"), representing two people in one conversation. Build it as an **inline SVG component** whose two halves use CSS variables (`fill: var(--primary)` and `fill: var(--accent)`) so it automatically recolors with the active theme.

```svg
<!-- TwinChat logo mark — inline SVG, recolors via CSS variables -->
<svg viewBox="0 0 96 72" width="32" height="24" role="img" aria-label="TwinChat">
  <path d="M14 10 h68 a12 12 0 0 1 12 12 v20 a12 12 0 0 1 -12 12 h-40 l-16 14 v-14 h-12 a12 12 0 0 1 -12 -12 v-20 a12 12 0 0 1 12 -12 z" fill="var(--primary)"/>
  <path d="M48 10 h34 a12 12 0 0 1 12 12 v20 a12 12 0 0 1 -12 12 h-34 z" fill="var(--accent)"/>
  <circle cx="35" cy="32" r="6" fill="#ffffff"/>
  <circle cx="61" cy="32" r="6" fill="#ffffff"/>
</svg>
```
- **In-app:** logo recolors with the theme (uses `var(--primary)` / `var(--accent)`).
- **Canonical/external use** (favicon, app icon, social images): use the **fixed Ocean version** — primary `#378ADD`, accent `#5DCAA5` — so there's one consistent TwinChat identity outside the app.
- The wordmark renders "Twin" in the primary text color and "Chat" in the accent/primary color.

### 7.3 Theme architecture
- Themes are defined as **CSS variables** on a `[data-theme]` (and `[data-mode]` for light/dark) attribute on the root element.
- A **ThemeContext** (React) sets these attributes → instant switching, no reload.
- **Persist** the choice on `User.theme` (and light/dark preference) in MongoDB → follows the user across devices. Apply on login.
- **All components reference the variables — never hardcode colors.** This is what makes theming (and adding future themes) trivial.
- v1 ships **Ocean (light)** as default with **Ocean (dark)** as the dark-mode variant. Keep the structure generic so Forest, Sunset, Rose, etc. can be added by defining one more variable block each.

### 7.4 Ocean palette — exact values

**Ocean — Light**
```css
--canvas:          #F3F8FC;  /* app background */
--surface:         #EAF2FA;  /* sidebar / conversation list */
--surface-2:       #FFFFFF;  /* cards, received message bubbles */
--rail:            #0C447C;  /* left icon rail (deep navy) */
--primary:         #378ADD;  /* buttons, sent bubbles, active states */
--primary-dark:    #185FA5;  /* hover / pressed */
--accent:          #1D9E75;  /* secondary highlights */
--accent-light:    #5DCAA5;  /* online status, subtle accents */
--border:          #D3E3F2;  /* hairline borders */
--text-primary:    #0C447C;  /* headings / strong text */
--text-body:       #1A2B3C;  /* body text */
--text-muted:      #7CA6CE;  /* placeholders, timestamps */
--on-primary:      #FFFFFF;  /* text on primary/sent bubbles */
```

**Ocean — Dark**
```css
--canvas:          #0E1420;  /* app background (deep blue-charcoal, not pure black) */
--surface:         #131B28;  /* sidebar / conversation list */
--surface-2:       #1B2635;  /* cards, received message bubbles */
--rail:            #0A1018;  /* left icon rail */
--primary:         #5AA0E6;  /* lightened for legibility on dark */
--primary-bubble:  #3B7FCB;  /* sent message bubbles */
--primary-dark:    #3B7FCB;  /* hover / pressed */
--accent:          #5DCAA5;  /* online status, accents */
--border:          #24303F;  /* hairline borders */
--text-primary:    #E6EDF5;  /* headings (off-white, never pure white) */
--text-body:       #D5E0EC;  /* body text */
--text-muted:      #5E7286;  /* placeholders, timestamps */
--on-primary:      #FFFFFF;  /* text on primary/sent bubbles */
```

> **Dark-mode rules:** never pure black backgrounds, never pure white text; lighten and slightly desaturate the primary blue so it doesn't glare. Teal accent works in both modes.

### 7.5 UI conventions
- **Sent messages:** `--primary` background, white text, tail on bottom-right.
- **Received messages:** `--surface-2` background with a `--border` hairline, body text, tail on bottom-left.
- **Active conversation** in the list: `--primary` highlight.
- **Online status:** `--accent` / teal dot + label.
- **Corners:** ~12px on cards and bubbles, pill (fully rounded) on the message input and search fields.
- **Icon rail:** deep navy (`--rail`) with muted icons; active icon in white/primary.
- **Send & attach buttons:** send is a filled `--primary` circle with a white icon; attach (paperclip) is a muted icon in the input bar.

---

## 8. Empty States & Loading States

Researched best practices — apply these:

**Empty states** (when there's no data yet):
- **No conversations:** friendly illustration + message + a clear CTA ("Find people to chat with" → opens Search). Never show a blank panel.
- **No friends yet:** show **suggested people** based on shared interests.
- **No search results:** "No matches — try different interests or names," and keep the filters visible so the user can adjust.
- **No requests:** simple "You're all caught up" message.
- **No group members beyond owner:** encourage sharing/inviting.
- Every empty state = **icon/illustration + one-line explanation + an action**. Turn dead ends into next steps.

**Loading states:**
- Use **skeleton screens** (grey placeholder shapes) for conversation lists, profiles, and search results — feels faster than spinners.
- Use **spinners** only for quick actions (sending a request, button submits).
- **Optimistic UI** for sending messages: show the message immediately, reconcile when the server confirms.
- Handle the **Render cold-start** gracefully: if the first request is slow, show a "waking up…" state rather than an error.
- Always handle the **error state** too (failed fetch → retry button).

---

## 9. Security & Best Practices
- **Never** return `password` or `email` in public API responses (use Mongoose `select: false` on password; exclude email from public profile serialization).
- Hash passwords with **bcrypt** (salt rounds ~10–12).
- Protect all non-auth routes with **JWT verification middleware**.
- Validate + sanitize all inputs server-side (Zod / express-validator).
- Authenticate the **Socket.IO connection** with the JWT too (not just REST).
- Store secrets (JWT secret, Mongo URI, Cloudinary keys) in **`.env`**, never commit them. Add `.env` to `.gitignore`.
- Set up **CORS** properly (allow only your frontend origin).
- Rate-limit auth endpoints (optional but good).
- **Validate file uploads server-side:** enforce the **1MB size limit** and an allowed-MIME-type whitelist *on the server*, not just the client (use `multer` limits + a MIME check). Never trust the client-reported size or type alone.

---

## 10. Suggestions & Nice-to-Haves
- **Minimum 3 interests at signup** so discovery works immediately.
- **Suggested people/groups** on first login (shared-interest based) so the app never feels empty.
- **Shared-interest indicator** everywhere ("4 in common") — reinforces the core value prop.
- **Forgot password / email verification** — you're collecting email; use it. Can be a later milestone (free with a service like Resend/Nodemailer + Gmail SMTP).
- **Online/offline presence + typing indicators** — cheap wins with Socket.IO that make it feel alive.
- **Read receipts / unread counts** — via `Message.readBy`.
- **Blocking/reporting** — deferred per your decision, but leave schema room (e.g. a `blockedUsers` array) so adding it later is painless.
- **Group roles** — currently owner-only; structured so multiple admins can be added later.

---

## 11. Starter Interest List (editable — stored in DB)

Seed the `Interest` collection with these. **Kept editable** so you can revise before finishing the project (edit rows / re-run seed script).

Technology, Programming, AI, Gaming, Movies, TV Shows, Music, Reading/Books, Writing, Photography, Art & Design, Football/Soccer, F1, Basketball, Cricket, Fitness, News & Politics, History, Science, Space, Travel, Food & Cooking, Fashion, Business & Startups, Finance/Investing, Anime, Nature/Outdoors, Podcasts.

> Optional `category` grouping (for a nicer selector UI): **Tech** (Technology, Programming, AI), **Entertainment** (Gaming, Movies, TV Shows, Music, Anime, Podcasts), **Sports** (Football/Soccer, F1, Basketball, Cricket, Fitness), **Culture** (Reading/Books, Writing, Photography, Art & Design, History, Fashion), **Knowledge** (Science, Space, News & Politics, Business & Startups, Finance/Investing), **Lifestyle** (Travel, Food & Cooking, Nature/Outdoors).

---

## 12. Environment Variables (reference)

**Server `.env`:**
```
PORT=5000
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random string>
CLIENT_URL=<frontend origin for CORS>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**Client `.env`:**
```
VITE_API_URL=<backend base URL>
VITE_SOCKET_URL=<backend socket URL>
```

---

## 13. Definition of Done (MVP checklist)
- [ ] User can sign up (hashed password, ≥3 interests, optional pic/bio) and log in.
- [ ] User can view/edit own profile (pic, bio) and log out.
- [ ] User can search people & groups, filtered by interest, with shared-interest indicator.
- [ ] User can send/accept/decline connection requests and unfriend.
- [ ] Friends can chat 1-on-1 in real time; can reply to messages.
- [ ] Users can attach and share images, video, or documents (≤1MB) in direct and group chats, with the limit enforced client- and server-side.
- [ ] User can create a group, join/leave groups, view members, open member profiles.
- [ ] Any group member can chat in the group; all members see messages.
- [ ] Owner-only group editing works.
- [ ] Color theme selection works and persists across devices.
- [ ] Empty and loading states are handled throughout.
- [ ] App deployed: frontend (Vercel/Netlify), backend (Render), DB (Atlas), images (Cloudinary).
