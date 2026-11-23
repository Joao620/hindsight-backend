# Hindsight Dash — API Reference

All endpoints are under `/api/*` and require **HTTP Basic Auth** (`BASIC_AUTH_USER` / `BASIC_AUTH_PASS` env vars).

---

## `GET /api/totals`

Total counts of boards, cards, and users.

**Response** `200`

```json
{
  "boards": 5,
  "cards": 35,
  "users": 4
}
```

---

## `GET /api/board-with-most-cards`

The board with the highest total card count, including its owner. Returns nulls if no data exists.

**Response** `200`

```json
{
  "board_name": "Sprint 42 Retro",
  "owner_name": "Alice",
  "card_count": 10
}
```

---

## `GET /api/last-card`

The most recently created card with author, board, and column info. Returns `null` if no cards exist.

**Response** `200`

```json
{
  "content": "Set up proper incident runbook",
  "author": "Carol",
  "board_name": "Project Phoenix Retro",
  "column_name": "Next Steps",
  "created_at": 1748563200
}
```

---

## `GET /api/most-active-boards`

Top 10 boards by card count created in the last 7 days.

**Response** `200`

```json
[
  { "board_name": "Sprint 43 Retro", "owner_name": "Alice", "card_count": 7 },
  { "board_name": "Project Phoenix Retro", "owner_name": "Carol", "card_count": 4 }
]
```

---

## `GET /api/cards-per-day`

Card creation count grouped by day.

| Query param | Type   | Default | Description              |
|-------------|--------|---------|--------------------------|
| `days`      | number | 30      | Number of days to look back |

**Response** `200`

```json
[
  { "day": "2026-05-01", "count": 3 },
  { "day": "2026-05-02", "count": 5 }
]
```

---

## `GET /api/cards-per-week`

Card creation count grouped by week.

| Query param | Type   | Default | Description               |
|-------------|--------|---------|---------------------------|
| `weeks`     | number | 12      | Number of weeks to look back |

**Response** `200`

```json
[
  { "week": "2026-W18", "count": 12 },
  { "week": "2026-W19", "count": 8 }
]
```

---

## `GET /api/recent-activity`

Most recent cards with author, board, and column details.

| Query param | Type   | Default | Description           |
|-------------|--------|---------|-----------------------|
| `limit`     | number | 20      | Max number of results |

**Response** `200`

```json
[
  {
    "content": "Zero downtime deploys!",
    "author": "Alice",
    "board_name": "Sprint 42 Retro",
    "column_name": "Went Well",
    "created_at": 1748463200
  }
]
```

---

## `POST /api/users`

Create a new user.

**Request body**

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `id`    | string | yes      | Unique user ID |
| `name`  | string | yes      | Display name |
| `email` | string | yes      | Email address (must be unique) |

**Response** `201`

```json
{
  "id": "u10",
  "name": "Eve",
  "email": "eve@example.com"
}
```

**Error** `400` — missing required fields

```json
{
  "error": "id, name, and email are required"
}
```

---

## `POST /api/boards`

Create a new board.

**Request body**

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | yes      | Unique board ID |
| `user_id` | string | yes      | Owner user ID (must reference existing user) |
| `name`    | string | yes      | Board name |

**Response** `201`

```json
{
  "id": "b10",
  "user_id": "u01",
  "name": "Sprint 44 Retro"
}
```

**Error** `400` — missing required fields

```json
{
  "error": "id, user_id, and name are required"
}
```

---

## `POST /api/board-columns`

Create a new column within a board.

**Request body**

| Field        | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `id`         | string | yes      | Unique column ID |
| `board_id`   | string | yes      | Parent board ID (must reference existing board) |
| `name`       | string | yes      | Column name |
| `sort_order` | number | no       | Sort order (defaults to 0) |

**Response** `201`

```json
{
  "id": "col10",
  "board_id": "b01",
  "name": "Action Items",
  "sort_order": 0
}
```

**Error** `400` — missing required fields

```json
{
  "error": "id, board_id, and name are required"
}
```

---

## `POST /api/cards`

Create a new card.

**Request body**

| Field       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `id`        | string | yes      | Unique card ID |
| `board_id`  | string | yes      | Parent board ID (must reference existing board) |
| `column_id` | string | yes      | Column ID (must reference existing column) |
| `user_id`   | string | yes      | Author user ID (must reference existing user) |
| `content`   | string | yes      | Card text |

**Response** `201`

```json
{
  "id": "c10",
  "board_id": "b01",
  "column_id": "col01",
  "user_id": "u01",
  "content": "Improve code review process"
}
```

**Error** `400` — missing required fields

```json
{
  "error": "id, board_id, column_id, user_id, and content are required"
}
```

---

## Authentication

All `/api/*` routes require HTTP Basic Authentication. Provide credentials via the `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` environment variables (or Cloudflare secrets).

**Request header:**

```
Authorization: Basic <base64(user:pass)>
```

**Unauthorized response:** `401` with `WWW-Authenticate: Basic realm="hindsight-dash"` header.
