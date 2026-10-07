# SharePoint ↔ form mapping (current list)

**Do not map from form (staff-only in list):** Staff Task List, Menu Due, Total Rooms Due, Vendor List Due, Gift Bag Due, Ready Room Access.

Rename Staff Task List choice **Total Rooms** → **Guest Rooms** in SharePoint (optional, clearer).

## Form → list

| List column | Type | Payload / expression |
|-------------|------|----------------------|
| Title | Text | `couple_name` |
| Draft ID | Text | `variables('DraftIDFinal')` / `outputs('DraftID_Submit')` |
| Status | Text | `draft` / `submitted` |
| Created at | DateTime | Create: `utcNow()` |
| Updated at | DateTime | `utcNow()` |
| Submitted at | DateTime | Submit: `utcNow()` |
| Couple Name | Text | `couple_name` |
| Wedding Date | DateOnly | `wedding_date` |
| Complete By | DateOnly | `complete_by` |
| Email | Text | `email` |
| Phone | Text | `phone` |
| FormPayload | Note | `string(json(triggerBody())?['payload'])` |
| **Guests** | Number | **`guests`** (room block count) |
| **Guest Notes** | Note | **`anticipated_rooms`** |
| **Accommodations** | Note | **`couple_accommodations`** |
| Group Arrival | DateOnly | `group_arrival` — Create/Update: `if(empty(...), null, ...)` so blank saves don’t send `""` |
| Group Departure | DateOnly | same null-if-empty |
| Wedding Venue | Text | `wedding_venue` |
| Ceremony Time | Text | `ceremony_time` |
| Reception Venue | Text | `reception_venue` |
| Reception Time | Text | `reception_time` |
| Gift Bags | Choice yes/no | `bags_providing` |
| Valet Needed | Choice yes/no | `valet_needed` |
| Valet Vehicles | Number | `valet_vehicles` |
| Valet Payment | Choice | `valet_payment` — must be `individual` / `hosted` / `master` / `other` |
| Valet Details | Note | Compose ValetDetails |
| Brunch | Choice yes/no | `brunch_hosting` |
| Menu Selected | Choice yes/no | `brunch_menu_submitted` |
| Brunch Time | DateTime | `brunch_datetime` — null-if-empty; UI only requires when brunch = yes |
| Brunch Attendance | Number | `brunch_attendance` |
| Brunch Requests | Note | `brunch_requests` |
| Vendors | Note | `string(...vendors)` |
| Ready Room | Choice yes/no | `getting_ready_needed` |
| **Ready Room Guests** | Number | **`getting_ready_guests`** |
| VIP/Accessibility | Note | Compose VIP + accessibility |
| Transport Block | Note | Compose TransportBlock |
| Weekend Contact | Text | `weekend_contact_name` |
| Weekend Phone | Text | `weekend_contact_phone` |

## Composes

**ValetDetails**
```text
Other: @{json(triggerBody())?['payload']?['valet_other']}
Billing contact: @{json(triggerBody())?['payload']?['valet_billing_contact']}
Instructions: @{json(triggerBody())?['payload']?['valet_billing_instructions']}
```

**TransportBlock** — company, contact, vehicles, pickups, return, venue (same as before).

**VipAccess**
```text
VIP: @{json(triggerBody())?['payload']?['vip_names']}
Accessibility: @{json(triggerBody())?['payload']?['accessibility']}
```
