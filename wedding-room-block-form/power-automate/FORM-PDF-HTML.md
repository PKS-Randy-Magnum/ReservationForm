# Form-styled PDF HTML (SubmitHTML / DraftHTML)

Replace junk summary + raw JSON. Re-paste after layout fixes so OneDrive PDF does not split mid-row.

## How to paste

1. Wipe Compose **SubmitHTML** / **DraftHTML** Inputs.
2. Paste the matching template below.
3. **Draft:** use `variables('DraftIDFinal')` and `Status: draft` (already in Draft template).
4. **Submit:** use `outputs('DraftID_Submit')` and `Status: submitted`.

## HTTP timeout on 2nd+ save

Put **Response 200** immediately after SharePoint Create/Update — **before** HTML → Create file → Convert → Email.  
2nd saves hit **Update** then re-convert PDF + email; if 200 is last, the browser times out even when the flow succeeds.

---

## SubmitHTML

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #0a1e3c; background: #fff; }
  .wrap { max-width: 700px; margin: 0 auto; }
  .brand { text-align: center; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid; }
  .brand img { height: 48px; margin: 0 auto 8px; display: block; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 22px; font-weight: 400; margin: 0 0 6px; }
  .intro { font-size: 13px; margin: 0 0 4px; }
  .ref { font-size: 11px; opacity: 0.75; margin: 0; }
  h2 { font-family: Georgia, "Times New Roman", serif; font-size: 15px; font-weight: 400; margin: 0 0 10px; padding-bottom: 4px; border-bottom: 1px solid #d4b483; page-break-after: avoid; }
  .section { margin: 0 0 14px; padding: 0 0 4px; page-break-inside: avoid; break-inside: avoid; }
  .pair { width: 100%; overflow: hidden; margin: 0 0 8px; page-break-inside: avoid; break-inside: avoid; }
  .field { width: 48%; float: left; margin: 0 0 8px; page-break-inside: avoid; break-inside: avoid; }
  .field.right { float: right; }
  .field.full { width: 100%; float: none; clear: both; }
  .pair:after, .section:after { content: ""; display: table; clear: both; }
  label { display: block; font-size: 10px; font-weight: 700; margin: 0 0 3px; }
  .box { background: #f9f7f2; border: 1px solid #c9c0b0; padding: 6px 8px; min-height: 14px; white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <img src="https://TheLasalleChicago-hydai.github.io/wedding-room-block-form/assets/logo.png" alt="The LaSalle Chicago" />
    <h1>Wedding Guest Room Block Details</h1>
    <p class="intro">Please complete by <strong>@{json(triggerBody())?['payload']?['complete_by']}</strong>. We’ll use this for your room block and weekend logistics.</p>
    <p class="ref">Reference: @{outputs('DraftID_Submit')} · Status: submitted</p>
  </div>

  <div class="section">
    <h2>Your contact details</h2>
    <div class="pair">
      <div class="field"><label>Couple / party name</label><div class="box">@{json(triggerBody())?['payload']?['couple_name']}</div></div>
      <div class="field right"><label>Wedding date</label><div class="box">@{json(triggerBody())?['payload']?['wedding_date']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Your email</label><div class="box">@{json(triggerBody())?['payload']?['email']}</div></div>
      <div class="field right"><label>Your phone</label><div class="box">@{json(triggerBody())?['payload']?['phone']}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Wedding basics</h2>
    <div class="pair">
      <div class="field"><label>Wedding / ceremony venue</label><div class="box">@{json(triggerBody())?['payload']?['wedding_venue']}</div></div>
      <div class="field right"><label>Ceremony time</label><div class="box">@{json(triggerBody())?['payload']?['ceremony_time']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Reception venue</label><div class="box">@{json(triggerBody())?['payload']?['reception_venue']}</div></div>
      <div class="field right"><label>Reception time</label><div class="box">@{json(triggerBody())?['payload']?['reception_time']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Group arrival date</label><div class="box">@{json(triggerBody())?['payload']?['group_arrival']}</div></div>
      <div class="field right"><label>Group departure date</label><div class="box">@{json(triggerBody())?['payload']?['group_departure']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Primary wedding-weekend contact</label><div class="box">@{json(triggerBody())?['payload']?['weekend_contact_name']}</div></div>
      <div class="field right"><label>Weekend contact phone</label><div class="box">@{json(triggerBody())?['payload']?['weekend_contact_phone']}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Rooms &amp; VIP</h2>
    <div class="pair">
      <div class="field"><label>Guest rooms (room block count)</label><div class="box">@{json(triggerBody())?['payload']?['guests']}</div></div>
      <div class="field right"><label>Getting-ready room needed?</label><div class="box">@{json(triggerBody())?['payload']?['getting_ready_needed']}</div></div>
    </div>
    <div class="field full"><label>Guest notes</label><div class="box">@{json(triggerBody())?['payload']?['anticipated_rooms']}</div></div>
    <div class="field full"><label>Accommodations for the wedding couple</label><div class="box">@{json(triggerBody())?['payload']?['couple_accommodations']}</div></div>
    <div class="field full"><label>Ready room guests (estimated)</label><div class="box">@{json(triggerBody())?['payload']?['getting_ready_guests']}</div></div>
    <div class="field full"><label>VIP / family names</label><div class="box">@{json(triggerBody())?['payload']?['vip_names']}</div></div>
    <div class="field full"><label>Accessibility / special requests</label><div class="box">@{json(triggerBody())?['payload']?['accessibility']}</div></div>
  </div>

  <div class="section">
    <h2>Transportation / shuttles</h2>
    <div class="pair">
      <div class="field"><label>Transportation company</label><div class="box">@{json(triggerBody())?['payload']?['transport_company']}</div></div>
      <div class="field right"><label>Company contact / cell</label><div class="box">@{json(triggerBody())?['payload']?['transport_contact']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Number / type of vehicles</label><div class="box">@{json(triggerBody())?['payload']?['transport_vehicles']}</div></div>
      <div class="field right"><label>First hotel pickup</label><div class="box">@{json(triggerBody())?['payload']?['transport_first_pickup']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Additional pickup time</label><div class="box">@{json(triggerBody())?['payload']?['transport_additional']}</div></div>
      <div class="field right"><label>Expected return time</label><div class="box">@{json(triggerBody())?['payload']?['transport_return']}</div></div>
    </div>
    <div class="field full"><label>Wedding venue (for shuttle)</label><div class="box">@{json(triggerBody())?['payload']?['transport_venue']}</div></div>
  </div>

  <div class="section">
    <h2>Valet parking</h2>
    <div class="pair">
      <div class="field"><label>Valet needed?</label><div class="box">@{json(triggerBody())?['payload']?['valet_needed']}</div></div>
      <div class="field right"><label>Parking arrangement</label><div class="box">@{json(triggerBody())?['payload']?['valet_payment']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>If other, describe</label><div class="box">@{json(triggerBody())?['payload']?['valet_other']}</div></div>
      <div class="field right"><label>Estimated vehicles</label><div class="box">@{json(triggerBody())?['payload']?['valet_vehicles']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Billing contact</label><div class="box">@{json(triggerBody())?['payload']?['valet_billing_contact']}</div></div>
      <div class="field right"><label>Billing instructions</label><div class="box">@{json(triggerBody())?['payload']?['valet_billing_instructions']}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Welcome / gift bags</h2>
    <div class="pair">
      <div class="field"><label>Providing gift bags?</label><div class="box">@{json(triggerBody())?['payload']?['bags_providing']}</div></div>
      <div class="field right"><label>Estimated quantity</label><div class="box">@{json(triggerBody())?['payload']?['bags_quantity']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Delivery date</label><div class="box">@{json(triggerBody())?['payload']?['bags_delivery_date']}</div></div>
      <div class="field right"><label>Delivery time</label><div class="box">@{json(triggerBody())?['payload']?['bags_delivery_time']}</div></div>
    </div>
    <div class="field full"><label>Person / vendor delivering</label><div class="box">@{json(triggerBody())?['payload']?['bags_deliverer']}</div></div>
    <div class="field full"><label>Distribution instructions</label><div class="box">@{json(triggerBody())?['payload']?['bags_distribution']}</div></div>
  </div>

  <div class="section">
    <h2>Vendor access</h2>
    <div class="field full"><label>Vendors (company / service / access)</label><div class="box">@{string(json(triggerBody())?['payload']?['vendors'])}</div></div>
  </div>

  <div class="section">
    <h2>Post-wedding brunch</h2>
    <div class="pair">
      <div class="field"><label>Hosting brunch?</label><div class="box">@{json(triggerBody())?['payload']?['brunch_hosting']}</div></div>
      <div class="field right"><label>Event date / time</label><div class="box">@{json(triggerBody())?['payload']?['brunch_datetime']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Estimated attendance</label><div class="box">@{json(triggerBody())?['payload']?['brunch_attendance']}</div></div>
      <div class="field right"><label>Menu selection submitted?</label><div class="box">@{json(triggerBody())?['payload']?['brunch_menu_submitted']}</div></div>
    </div>
    <div class="field full"><label>Special requests</label><div class="box">@{json(triggerBody())?['payload']?['brunch_requests']}</div></div>
  </div>

  <div class="section">
    <h2>Important dates</h2>
    <div class="pair">
      <div class="field"><label>Guest room cutoff</label><div class="box">@{json(triggerBody())?['payload']?['date_room_cutoff']}</div></div>
      <div class="field right"><label>Menu selections due</label><div class="box">@{json(triggerBody())?['payload']?['date_menu_due']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Final vendor list due</label><div class="box">@{json(triggerBody())?['payload']?['date_vendor_list']}</div></div>
      <div class="field right"><label>Gift bag delivery</label><div class="box">@{json(triggerBody())?['payload']?['date_gift_bag']}</div></div>
    </div>
    <div class="pair">
      <div class="field"><label>Getting-ready room access</label><div class="box">@{json(triggerBody())?['payload']?['date_getting_ready']}</div></div>
      <div class="field right"><label>Complete by</label><div class="box">@{json(triggerBody())?['payload']?['complete_by']}</div></div>
    </div>
  </div>
</div>
</body>
</html>
```

---

## DraftHTML

Same as Submit, but reference line is:

```html
    <p class="ref">Reference: @{variables('DraftIDFinal')} · Status: draft</p>
```

(Copy the Submit template and only change that one line — or change `outputs('DraftID_Submit')` → `variables('DraftIDFinal')` and `submitted` → `draft`.)
