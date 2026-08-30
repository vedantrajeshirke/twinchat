# TwinChat: API & Socket Contract

Derived from `PROJECT_PLAN.md`. This is the interface the client codes against.

**Base URL:** `${VITE_API_URL}` → `http://localhost:5050/api`
**Auth:** `Authorization: Bearer <jwt>` on every route except those marked _public_.
**Errors:** `{ "message": string, "details"?: [{ field, message }] }` with a 4xx/5xx status.

### Shared shapes

```jsonc
// PublicUser: safe for anyone. Never contains email or password.
{ "_id", "firstName", "lastName", "username", "bio", "profilePicture",
  "interests": ["Technology"], "createdAt" }

// PrivateUser, the account owner only. PublicUser + these:
{ "email", "theme", "mode", "friends": ["<userId>"], "groups": ["<groupId>"] }

// UserCard, a search/suggestion result. PublicUser + relationship context:
{ ...PublicUser,
  "sharedInterests": ["Technology", "AI"],   // intersection with the viewer
  "sharedCount": 2,
  "relationship": "self" | "friend" | "request_sent" | "request_received" | "none" }

// Attachment
{ "url", "type": "image"|"video"|"document", "fileName", "mimeType", "size" }
```

---

## 1. Auth: `/auth`

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/signup` | public | `firstName, lastName, username, email, password, confirmPassword, interests[≥3], bio?, profilePicture?` | `{ token, user: PrivateUser }` |
| POST | `/auth/login` | public | `identifier` (email **or** username), `password` | `{ token, user: PrivateUser }` |
| GET | `/auth/me` | ✔ |: | `{ user: PrivateUser }` |
| GET | `/auth/check-username?username=` | public |: | `{ available: boolean }` |
| PATCH | `/auth/password` | ✔ | `currentPassword, newPassword` | `{ message }` |

Login failures return a single generic `401 "Incorrect username/email or password"`, never
reveal which field was wrong (PROJECT_PLAN §5.3).

## 2. Users: `/users`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/search?q=&interests=A,B&page=&limit=` | ✔ | People discovery. Sorted by shared-interest count desc. → `{ results: UserCard[], page, totalPages, total }` |
| GET | `/users/suggested` | ✔ | Non-friends with the most interests in common → `{ results: UserCard[] }` |
| GET | `/users/:username` | ✔ | Public profile → `{ user: UserCard, groups: GroupCard[] }` |
| PATCH | `/users/me` | ✔ | `bio?, firstName?, lastName?, interests?, theme?, mode?` → `{ user: PrivateUser }` |
| POST | `/users/me/avatar` | ✔ | `multipart/form-data` field `file` (image, ≤1MB) → `{ user: PrivateUser }` |
| GET | `/users/me/friends` | ✔ | → `{ friends: UserCard[] }` |
| DELETE | `/users/me/friends/:userId` | ✔ | Unfriend, both directions → `{ message }` |

## 3. Connection requests: `/requests`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/requests` | ✔ | → `{ incoming: [{_id, from: UserCard, createdAt}], outgoing: [{_id, to: UserCard, createdAt}], incomingCount }` |
| POST | `/requests` | ✔ | `{ toUserId }` → `{ request }`. 409 if already friends/pending. |
| PATCH | `/requests/:id/accept` | ✔ | Recipient only. Adds each to the other's `friends`, creates the direct Conversation → `{ conversation, friend: UserCard }` |
| PATCH | `/requests/:id/decline` | ✔ | Recipient only → `{ message }` |
| DELETE | `/requests/:id` | ✔ | Sender cancels a pending request → `{ message }` |

## 4. Groups: `/groups`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/groups/search?q=&interests=&page=&limit=` | ✔ | → `{ results: GroupCard[], ... }`. `GroupCard` = group + `memberCount`, `isMember`, `isOwner` |
| GET | `/groups/suggested` | ✔ | Groups whose `mainInterest` matches the viewer's interests |
| GET | `/groups/mine` | ✔ | Groups the viewer belongs to |
| POST | `/groups` | ✔ | `multipart`: `name, mainInterest, description?, file?` → creator becomes owner + first member, group Conversation created → `{ group }` |
| GET | `/groups/:id` | ✔ | → `{ group: GroupCard, members: UserCard[], conversationId }` |
| PATCH | `/groups/:id` | ✔ owner | `multipart`: `name?, mainInterest?, description?, file?` → `{ group }` |
| POST | `/groups/:id/join` | ✔ | → `{ group, conversationId }` |
| POST | `/groups/:id/leave` | ✔ | Owner cannot leave without transferring/deleting → `{ message }` |
| DELETE | `/groups/:id` | ✔ owner | Deletes group, conversation and messages → `{ message }` |

## 5. Conversations & messages: `/conversations`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/conversations` | ✔ | Sorted by `updatedAt` desc → `{ conversations: ConversationSummary[] }` |
| POST | `/conversations/direct` | ✔ | `{ userId }`: friends only, idempotent → `{ conversation }` |
| GET | `/conversations/:id/messages?before=&limit=30` | ✔ participant | Newest-last page → `{ messages: Message[], hasMore }` |
| POST | `/conversations/:id/messages` | ✔ participant | `multipart`: `content?, replyTo?, file?` (≤1MB). Needs text or file. → `{ message }` and broadcasts `message:new` |
| POST | `/conversations/:id/read` | ✔ participant | Marks all as read → `{ message }`, broadcasts `message:read` |

```jsonc
// ConversationSummary
{ "_id", "type": "direct"|"group",
  "title", "avatar",              // resolved from the other user or the group
  "otherUser": PublicUser | null, // direct only
  "group":     GroupCard  | null, // group only
  "lastMessage": Message | null,
  "unreadCount": 3,
  "updatedAt" }
```

**Permissions (PROJECT_PLAN §6):** direct conversations require an accepted friendship;
group conversations are open to every member regardless of friendship. Both are re-checked
server-side on every send.

## 6. Interests: `/interests`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/interests` | public | → `{ interests: Interest[], categories: [{ name, interests }] }` |

---

## 7. Socket.IO

Connect to `${VITE_SOCKET_URL}` with `auth: { token }`. The handshake verifies the JWT and
rejects otherwise (PROJECT_PLAN §9). On connect the socket auto-joins a personal room
(`user:<id>`) and a room per conversation the user participates in.

**Client → server**

| Event | Payload | Effect |
|---|---|---|
| `conversation:join` | `conversationId` | Joins the room after membership check |
| `conversation:leave` | `conversationId` | Leaves the room |
| `typing:start` | `{ conversationId }` | Broadcasts `typing` to the room |
| `typing:stop` | `{ conversationId }` | Broadcasts `typing:stopped` |
| `message:read` | `{ conversationId }` | Marks read, broadcasts receipt |

**Server → client**

| Event | Payload |
|---|---|
| `message:new` | `{ conversationId, message }` |
| `conversation:updated` | `ConversationSummary`: reorders the list |
| `typing` / `typing:stopped` | `{ conversationId, user: { _id, firstName } }` |
| `message:read` | `{ conversationId, userId }` |
| `presence:online` / `presence:offline` | `{ userId }` |
| `presence:sync` | `{ userIds: [] }`: sent once on connect |
| `request:new` | `{ request }`: live badge update |
| `request:accepted` | `{ conversation, friend: UserCard }` |
| `group:updated` | `{ group }` |
