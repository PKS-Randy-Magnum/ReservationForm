# Wedding Room Block — ordered setup (SharePoint List)

**This is the only backend guide to follow.**  
Do not use Excel Online for this project (blocked by admin approval).  
Do not skip columns or “add later.” Finish each phase and test before the next.

**Newer ops (staff mode / flatten / PDF):** see [power-automate/STAFF-PDF.md](power-automate/STAFF-PDF.md) and updated [power-automate/FIELD-MAP.md](power-automate/FIELD-MAP.md). Prefer **FormPayload** (multi-line), not the old 255-char Payload column. Password Condition should accept **FormPassword OR StaffPassword**.

---

## Your locked decisions

| Item | Value |
|------|--------|
| Storage | Microsoft List **Wedding Room Planner** (personal / My lists) |
| Site Address (Power Automate) | `https://aimhosp-my.sharepoint.com/personal/hongyu_dai_thelasallechicago_com` |
| List Name | `Wedding Room Planner` |
| Flow name | Wedding Room Block Form - API |
| Body parsing | Always `json(triggerBody())?...` (form sends `text/plain`) |
| Password check | `json(triggerBody())?['password']` equals `outputs('FormPassword')` |
| Actions | `unlock` · `saveDraft` · `loadDraft` · `submitFinal` |
| Hosting (form) | GitHub Pages (after flow is fully working locally) |

---

## Phase 0 — Finish the list columns (do this first)

Open **Wedding Room Planner**. You already have most columns. Confirm **every** column below exists. If any are missing, add them **now**.

| Display name | Type | Required |
|--------------|------|----------|
| Title | Single line of text (default) | Yes (SharePoint default) |
| Draft ID | Single line of text | Yes |
| Status | Single line of text | Yes |
| Created at | Single line of text | Yes |
| Updated at | Single line of text | Yes |
| Submitted at | Single line of text | Yes — **add if missing** |
| Couple Name | Single line of text | Yes |
| Wedding Date | Single line of text | Yes |
| Email | Single line of text | Yes |
| Phone | Single line of text | Yes |
| Payload | Multiple lines of text (plain) | Yes |

**How to find internal column names** (needed for Filter Query):

1. List settings (gear) → click the column name  
2. Look at the URL: `Field=Something` → that `Something` is the internal name  
3. Write them down. Spaces often become `_x0020_` (example: `Draft ID` → `Draft_x0020_ID`)

You will use the **internal** name only in OData Filter Query. In Create/Update item UI, pick columns by **display** name from the dropdown.

**Not a list column:** the form’s **complete-by** date (`complete_by`) is stored only inside **Payload** JSON. Do not add a Complete By column unless you want it for sorting in the list.

**Copy-paste map for Create/Update:** [power-automate/FIELD-MAP.md](power-automate/FIELD-MAP.md)

**Phase 0 done when:** all 11 columns above exist, including **Submitted at**.

---

## Phase 1 — Flow skeleton (already done if Unlock works)

Required shape:

```text
manual (HTTP)
  → FormPassword (Compose) = your access code
  → Condition: json(triggerBody())?['password']  equals  outputs('FormPassword')
       False → Response 401  { "ok": false, "error": "Invalid access code." }
       True  → Switch On: json(triggerBody())?['action']
                Case unlock      → Response 200 { "ok": true }
                Case saveDraft   → (Phase 2)
                Case loadDraft   → (Phase 3)
                Case submitFinal → (Phase 4)
                Default          → Response 400 { "ok": false, "error": "Unknown action." }
```

HTTP trigger body schema (exact):

```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string" },
    "password": { "type": "string" },
    "draft_id": { "type": "string" },
    "form_url": { "type": "string" },
    "email": { "type": "string" },
    "wedding_date": { "type": "string" },
    "payload": { "type": "object" }
  }
}
```

**CORS on every Response** (401, unlock 200, default 400, and all later Responses):

| Header | Value |
|--------|--------|
| Access-Control-Allow-Origin | `*` |
| Access-Control-Allow-Methods | `POST, OPTIONS` |
| Access-Control-Allow-Headers | `Content-Type` |

**Phase 1 done when:** form Unlock works; wrong password returns “Invalid access code.”

---

## Phase 2 — `saveDraft` (complete; test before Phase 3)

Build **only** inside Switch case **Equals** = `saveDraft`.

### 2.1 Compose `DraftId`

**Inputs** (Expression):

```text
if(empty(json(triggerBody())?['draft_id']), guid(), json(triggerBody())?['draft_id'])
```

### 2.2 Compose helpers (identity)

Create these Compose actions (names exact):

| Name | Expression |
|------|------------|
| `CoupleName` | `json(triggerBody())?['payload']?['couple_name']` |
| `WeddingDate` | `json(triggerBody())?['payload']?['wedding_date']` |
| `CustomerEmail` | `json(triggerBody())?['payload']?['email']` |
| `CustomerPhone` | `json(triggerBody())?['payload']?['phone']` |
| `PayloadText` | `string(json(triggerBody())?['payload'])` |
| `NowUtc` | `utcNow()` |

### 2.3 SharePoint — Get items

| Field | Value |
|-------|--------|
| Site Address | `https://aimhosp-my.sharepoint.com/personal/hongyu_dai_thelasallechicago_com` |
| List Name | `Wedding Room Planner` |
| Filter Query | `Draft_x0020_ID eq '@{outputs('DraftId')}'` |

If Filter Query fails in a test run, replace `Draft_x0020_ID` with the **internal name** from Phase 0.

Rename this action to **`GetDraftItems`** (⋯ → Rename) so expressions stay stable.

### 2.4 Condition — row exists?

- Left (Expression): `length(body('GetDraftItems')?['value'])`
- Operator: is greater than
- Right: `0`

### 2.5 True branch — Update item

SharePoint **Update item**:

| Field | Value |
|-------|--------|
| Site Address | same as above |
| List Name | `Wedding Room Planner` |
| Id | Expression: `first(body('GetDraftItems')?['value'])?['ID']` |
| Title | `outputs('CoupleName')` |
| Draft ID | `outputs('DraftId')` |
| Status | `draft` |
| Created at | Expression: `first(body('GetDraftItems')?['value'])?['Created_x0020_at']` (use your internal name if different) |
| Updated at | `outputs('NowUtc')` |
| Submitted at | leave empty / do not clear existing if UI allows |
| Couple Name | `outputs('CoupleName')` |
| Wedding Date | `outputs('WeddingDate')` |
| Email | `outputs('CustomerEmail')` |
| Phone | `outputs('CustomerPhone')` |
| Payload | `outputs('PayloadText')` |

### 2.6 False branch — Create item

SharePoint **Create item** — same site/list. Map:

| Field | Value |
|-------|--------|
| Title | `outputs('CoupleName')` |
| Draft ID | `outputs('DraftId')` |
| Status | `draft` |
| Created at | `outputs('NowUtc')` |
| Updated at | `outputs('NowUtc')` |
| Submitted at | *(leave blank)* |
| Couple Name | `outputs('CoupleName')` |
| Wedding Date | `outputs('WeddingDate')` |
| Email | `outputs('CustomerEmail')` |
| Phone | `outputs('CustomerPhone')` |
| Payload | `outputs('PayloadText')` |

### 2.7 Send an email (V2) — customer resume link

Place **after** the Create/Update Condition (same level as the Condition ends — so it runs for both branches).

| Field | Value |
|-------|--------|
| To | `outputs('CustomerEmail')` |
| Subject | `Your wedding room block form — resume link` |
| Body | See below |

Body (HTML or text):

```text
Your progress was saved.

Resume link:
@{json(triggerBody())?['form_url']}?draft=@{outputs('DraftId')}

Reference: @{outputs('DraftId')}

You will still need the access code to open the form.
```

Until GitHub Pages exists, `form_url` will be your local `http://localhost:...` URL from the browser. That is correct for testing. After Pages is live, the same field will carry the public URL automatically from the form.

### 2.8 Response 200

Status Code: `200`  
Body (Expression):

```text
json(concat('{"ok":true,"draft_id":"', outputs('DraftId'), '"}'))
```

CORS headers as in Phase 1.

### 2.9 Test Phase 2 (required)

1. Flow **On** · **Save**
2. Form: Unlock → fill couple name, wedding date, complete-by, email, phone → **Save progress**
3. Expect: status “Saved…”, URL gets `?draft=...`
4. List shows one item, Status = `draft`, Payload filled
5. Email arrives with resume link
6. Run history: `saveDraft` path succeeded

**Do not start Phase 3 until all six checks pass.**

---

## Phase 3 — `loadDraft` (complete)

New Switch case Equals: `loadDraft`.

### 3.1 Condition — has draft_id?

- Left: `json(triggerBody())?['draft_id']`
- Operator: is not equal to
- Right: *(empty string)*

### 3.2 True — Get by Draft ID

**Get items** (rename `GetByDraftId`):

- Site / List same as Phase 2  
- Filter Query: `Draft_x0020_ID eq '@{json(triggerBody())?['draft_id']}'`

### 3.3 False — Get by email + wedding date

**Get items** (rename `GetByEmailWedding`):

- Filter Query (adjust internal names):

```text
Email eq '@{json(triggerBody())?['email']}' and Wedding_x0020_Date eq '@{json(triggerBody())?['wedding_date']}'
```

### 3.4 After each Get — if empty, 404

Condition: `length(body('GetByDraftId')?['value'])` greater than `0`  
(or `GetByEmailWedding` on that branch)

- **False:** Response `404` body `{ "ok": false, "error": "No saved progress found." }`
- **True:** Response `200` with Expression body:

```text
json(concat(
  '{"ok":true,"draft_id":"',
  first(body('GetByDraftId')?['value'])?['Draft_x0020_ID'],
  '","status":"',
  first(body('GetByDraftId')?['value'])?['Status'],
  '","payload":',
  first(body('GetByDraftId')?['value'])?['Payload'],
  '}'
))
```

Use the matching Get action name on the email branch.  
`Payload` must be stored as raw JSON text so this concatenation is valid JSON.

CORS on both Responses.

### 3.5 Test Phase 3

1. Open the resume link from the email (or same `?draft=` URL) → Unlock → form reloads data  
2. Lock screen → Resume with email + wedding date → loads  

**Do not start Phase 4 until both resume paths work.**

---

## Phase 4 — `submitFinal` (complete)

New Switch case Equals: `submitFinal`.

Copy the **entire** Phase 2 structure (DraftId → helpers → GetDraftItems → Create/Update), with these **exact** differences:

| Field | Value |
|-------|--------|
| Status | `submitted` |
| Submitted at | `outputs('NowUtc')` (on both Create and Update) |
| Updated at | `outputs('NowUtc')` |

**Email:** Send an email (V2) **To your work address** (`Hongyu.Dai@thelasallechicago.com` or whatever you use):

- Subject: `[Room block submitted] @{outputs('CoupleName')} — @{outputs('WeddingDate')}`
- Body: couple, dates, email, phone, draft id, resume link (`form_url?draft=DraftId`)

**Response:** same as saveDraft (`ok` + `draft_id`).

### 4.1 Test Phase 4

1. Submit final on form → thank-you page  
2. List item Status = `submitted`, Submitted at filled  
3. You receive staff email  

---

## Phase 5 — GitHub Pages (only after Phases 2–4 pass)

1. Push project folder to a GitHub repo  
2. Settings → Pages → deploy from `main` / root  
3. Confirm `https://YOURUSER.github.io/REPO/` loads  
4. In [`config.js`](../config.js): `MOCK_MODE` false; `API_URL` = full HTTP URL with `sig`  
5. Push again if config changed  
6. Smoke test on the **Pages** URL: unlock → save → resume → submit  

Share with customers: **Pages URL + FormPassword**. Never share the Power Automate URL.

---

## Expression cheat sheet (always)

```text
json(triggerBody())?['action']
json(triggerBody())?['password']
json(triggerBody())?['draft_id']
json(triggerBody())?['form_url']
json(triggerBody())?['email']
json(triggerBody())?['wedding_date']
json(triggerBody())?['payload']?['couple_name']
```

Do **not** use bare `triggerBody()?['password']` for this form.

---

## Designer tip

If Switch / cases are hard to find: turn **New designer OFF** (classic), finish the case, Save, then switch back if you want.

---

## What you are doing right now

1. Complete Phase 0 (add **Submitted at** if missing; note internal names)  
2. Fix Get items **Site Address** to personal site root only (no `/Lists/...`)  
3. Build Phase 2 through 2.9 and pass all six tests  

Reply with “Phase 2 tests passed” or the **exact** Run history error when something fails — one phase at a time.
