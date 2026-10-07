# Staff password, invite links, PDF on submit

## 1. Accept guest OR staff password

1. Add Compose **StaffPassword** (next to **FormPassword**) with your staff code (same value as `STAFF_PASSWORD` in `config.js`).
2. Change the top **Condition** from password equals FormPassword to **OR**:
   - `json(triggerBody())?['password']` **is equal to** `outputs('FormPassword')`
   - **OR** `json(triggerBody())?['password']` **is equal to** `outputs('StaffPassword')`
3. Unlock **200** body must return whether the password was staff (frontend no longer stores staff code):

```text
{
  "ok": true,
  "staff": @{equals(json(triggerBody())?['password'], outputs('StaffPassword'))}
}
```

Or as Expression body:
```text
json(concat('{"ok":true,"staff":', if(equals(json(triggerBody())?['password'], outputs('StaffPassword')), 'true', 'false'), '}'))
```

**Rotate StaffPassword** in the flow to a new secret (the old one was in public GitHub history). Do not put it in `config.js`.

---

## 2. Invite URL (coordinator)

Live form (GitHub Pages):

```text
https://TheLasalleChicago-hydai.github.io/wedding-room-block-form/?wedding_date=2026-06-15&complete_by=2026-05-16
```

Resume an existing draft (dates optional but useful for staff/invite links):

```text
https://TheLasalleChicago-hydai.github.io/wedding-room-block-form/?draft=4ba53f80&wedding_date=2026-06-15&complete_by=2026-05-16
```

| Query param | Purpose |
|-------------|---------|
| `wedding_date` | Prefills wedding date (`YYYY-MM-DD` or `MM/DD/YYYY`) |
| `complete_by` | Prefills complete-by (guest field is read-only; staff can edit) |
| `draft` | Loads that SharePoint draft after unlock |

- If `complete_by` is omitted but `wedding_date` is set, the form defaults complete-by to wedding − 30 days.
- Join params with `&`. Do not put spaces in the URL (use `2026-06-15`).

---

## 3. Silent staff edits (no email)

The form sends `"staff": true` when unlocked with the staff password. Branch on that so staff never trigger Outlook.

### SaveDraft (staff)

After Create/Update item succeeds, wrap the **file + email** steps in a Condition:

- Left: `json(triggerBody())?['staff']`
- Operator: **is equal to**
- Right: `true` (boolean) — or Expression `true`

| Branch | Actions |
|--------|---------|
| **True** (staff) | Skip Create file Draft / Convert Draft / customer email. Go straight to **200 SaveDraft**. List row still updates. |
| **False** (guest) | Existing path: DraftHTML → Create file → Convert → Send email (customer resume) → **200** |

### SubmitFinal (staff)

Same idea after Create/Update:

| Branch | Actions |
|--------|---------|
| **True** (staff) | Keep SubmitHTML → Create file → Convert PDF (overwrite/update the submitted PDF). **Skip** Send email (V2) Submit. Then **200 Submit**. |
| **False** (guest) | Full path: HTML → file → PDF → staff email → **200** |

**200** on both paths: Configure run after Succeeded / Failed / Timed out / Skipped on the last optional step (email or Convert) so the form still gets `{ "ok": true }`.

Result:

- Staff **Save progress** → SharePoint draft columns only (no email, no Drafts file churn).
- Staff **Submit** after a customer already submitted → list + PDF refresh only (no second staff/customer email).

---

## 4. Flatten SharePoint columns

See [FIELD-MAP.md](FIELD-MAP.md). Add priority columns first (Complete By, Gift bags, Valet needed, Valet payment), then remapping Create/Update. Re-add Create/Update after new columns so the connector schema refreshes.

---

## 5. PDF attachment on `submitFinal`

HTML must look like the **form**, not a JSON dump.

1. Replace Compose **SubmitHTML** / **DraftHTML** using [FORM-PDF-HTML.md](FORM-PDF-HTML.md). **Delete** any `<pre>` / `string(payload)` block.
2. **Create file** (OneDrive Submitted / Drafts folder): couple + draft id + `submitted.html` / `draft.html`.
3. **Convert file** → PDF.
4. **Send an email (V2) Submit** (guest only — see §3): attach PDF.
5. **200 Submit** → run after Succeeded / Failed / Timed out / Skipped.

---

## 6. Frontend config

In `config.js`:

- `MOCK_STAFF_PASSWORD` — mock only (`staff` by default)
- Live staff code lives **only** in Power Automate Compose **StaffPassword** (not in this repo)
