(function () {
  "use strict";

  const cfg = window.FORM_CONFIG || {};
  const SESSION_KEY = "lasalle_form_unlocked";
  const PASSWORD_KEY = "lasalle_form_password";
  const STAFF_KEY = "lasalle_form_staff";

  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("app"),
    thanks: document.getElementById("thanks"),
    thanksDraft: document.getElementById("thanks-draft"),
    unlockForm: document.getElementById("unlock-form"),
    resumeForm: document.getElementById("resume-form"),
    resumePanel: document.getElementById("resume-panel"),
    showResume: document.getElementById("show-resume"),
    gateStatus: document.getElementById("gate-status"),
    accessPassword: document.getElementById("access-password"),
    form: document.getElementById("wedding-form"),
    saveStatus: document.getElementById("save-status"),
    saveBtn: document.getElementById("save-btn"),
    submitBtn: document.getElementById("submit-btn"),
    saveBtnFooter: document.getElementById("save-btn-footer"),
    submitBtnFooter: document.getElementById("submit-btn-footer"),
    vendorRows: document.getElementById("vendor-rows"),
    addVendor: document.getElementById("add-vendor"),
    vendorTemplate: document.getElementById("vendor-row-template"),
    draftId: document.getElementById("draft_id"),
    completeBy: document.getElementById("complete_by"),
    formTitle: document.getElementById("form-title"),
    introBefore: document.getElementById("intro-before"),
    introAfter: document.getElementById("intro-after"),
    staffBadge: document.getElementById("staff-badge"),
    beyond30: document.getElementById("beyond-30-warning"),
    staffDatesSection: document.getElementById("staff-dates-section"),
  };

  let dirty = false;
  let saving = false;
  let sessionPassword = sessionStorage.getItem(PASSWORD_KEY) || "";
  let staffMode = sessionStorage.getItem(STAFF_KEY) === "1";
  let autoCompleteBy = true;

  function apiConfigured() {
    return (
      cfg.API_URL &&
      !cfg.API_URL.includes("PASTE_POWER_AUTOMATE") &&
      !cfg.API_URL.includes("PASTE_APPS_SCRIPT")
    );
  }

  function mockMode() {
    return cfg.MOCK_MODE === true;
  }

  function isStaffPassword(password) {
    /* Live staff detection = Power Automate unlock response { staff: true } only.
       Never store the live staff code in this public frontend. */
    if (mockMode() && String(password) === String(cfg.MOCK_STAFF_PASSWORD || "staff")) return true;
    return false;
  }

  function mockStoreKey() {
    return "lasalle_form_mock_drafts";
  }

  function readMockStore() {
    try {
      return JSON.parse(localStorage.getItem(mockStoreKey()) || "{}");
    } catch {
      return {};
    }
  }

  function writeMockStore(store) {
    localStorage.setItem(mockStoreKey(), JSON.stringify(store));
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "draft-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  async function mockApi(action, body) {
    const mockPassword = cfg.MOCK_PASSWORD || "preview";
    const mockStaff = cfg.MOCK_STAFF_PASSWORD || "staff";
    const okPw =
      String(body.password) === String(mockPassword) ||
      String(body.password) === String(mockStaff);

    if (action === "unlock") {
      if (!okPw) {
        throw new Error("Invalid access code. (Mock mode password is in config.js)");
      }
      return { ok: true, staff: isStaffPassword(body.password) };
    }

    if (!okPw) {
      throw new Error("Invalid access code.");
    }

    const store = readMockStore();

    if (action === "saveDraft" || action === "submitFinal") {
      const payload = body.payload || {};
      const draftId = body.draft_id || uuid();
      store[draftId] = {
        draft_id: draftId,
        status: action === "submitFinal" ? "submitted" : "draft",
        payload: payload,
        email: payload.email,
        wedding_date: payload.wedding_date,
      };
      writeMockStore(store);
      return { ok: true, draft_id: draftId };
    }

    if (action === "loadDraft") {
      let record = null;
      if (body.draft_id && store[body.draft_id]) {
        record = store[body.draft_id];
      } else if (body.email && body.wedding_date) {
        const email = String(body.email).trim().toLowerCase();
        const wedding = normalizeDateToIso(body.wedding_date) || String(body.wedding_date).trim();
        Object.keys(store).forEach((id) => {
          const row = store[id];
          const rowWedding = normalizeDateToIso(row.wedding_date) || String(row.wedding_date || "");
          if (String(row.email || "").toLowerCase() === email && rowWedding === wedding) {
            record = row;
          }
        });
      }
      if (!record) throw new Error("No saved progress found. (Mock mode uses this browser only.)");
      return { ok: true, draft_id: record.draft_id, payload: record.payload, status: record.status };
    }

    throw new Error("Unknown action.");
  }

  /* —— Date helpers (UI MM/DD/YYYY, payload YYYY-MM-DD) —— */

  function digitsOnly(value, max) {
    const d = String(value || "").replace(/\D/g, "");
    return max ? d.slice(0, max) : d;
  }

  function formatPhoneDisplay(value) {
    const d = digitsOnly(value, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }

  function formatDateDisplay(value) {
    const d = digitsOnly(value, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
    return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
  }

  function parseUsDateParts(display) {
    const m = String(display || "")
      .trim()
      .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
    return { year, month, day, date: dt };
  }

  function usToIso(display) {
    const p = parseUsDateParts(display);
    if (!p) return "";
    return (
      String(p.year) +
      "-" +
      String(p.month).padStart(2, "0") +
      "-" +
      String(p.day).padStart(2, "0")
    );
  }

  function isoToUs(iso) {
    if (!iso) return "";
    const m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[2] + "/" + m[3] + "/" + m[1];
    if (parseUsDateParts(iso)) return formatDateDisplay(iso);
    return "";
  }

  function normalizeDateToIso(value) {
    if (!value) return "";
    const s = String(value).trim();
    let iso = "";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const us = isoToUs(s);
      iso = usToIso(us) || s.slice(0, 10);
    } else {
      iso = usToIso(s);
    }
    if (!iso) return "";
    const year = Number(iso.slice(0, 4));
    if (year < 2000 || year > 2100) return "";
    return iso;
  }

  function isValidDateValue(value) {
    return Boolean(normalizeDateToIso(value));
  }

  function addDaysIso(iso, days) {
    const p = parseUsDateParts(isoToUs(iso));
    if (!p) return "";
    const d = new Date(p.date.getTime());
    d.setDate(d.getDate() + days);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function compareIso(a, b) {
    if (!a || !b) return 0;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }

  function isValidPhone(value) {
    return digitsOnly(value, 15).length === 10;
  }

  function isValidNumeric(value, allowEmpty) {
    const s = String(value || "").trim();
    if (!s) return !!allowEmpty;
    return /^\d+$/.test(s);
  }

  function isValidTime(value) {
    const s = String(value || "").trim();
    if (!s) return false;
    const m = s.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return false;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = m[3] != null ? Number(m[3]) : 0;
    return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59;
  }

  function isValidDateTimeLocal(value) {
    const s = String(value || "").trim();
    if (!s) return false;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return false;
    const year = Number(m[1]);
    if (year < 1900 || year > 2100) return false;
    const isoDate = m[1] + "-" + m[2] + "-" + m[3];
    if (!normalizeDateToIso(isoDate)) return false;
    return isValidTime(m[4] + ":" + m[5] + (m[6] != null ? ":" + m[6] : ""));
  }

  function normalizeDateTimeLocal(value) {
    const s = String(value || "").trim();
    if (!s) return "";
    if (isValidDateTimeLocal(s)) {
      return s.length === 16 ? s : s.slice(0, 16);
    }
    /* Accept ISO date + time fragments from older payloads */
    const iso = normalizeDateToIso(s.slice(0, 10));
    const timePart = s.includes("T") ? s.split("T")[1] : s.includes(" ") ? s.split(" ")[1] : "";
    if (iso && timePart && isValidTime(timePart.slice(0, 8))) {
      return iso + "T" + timePart.slice(0, 5);
    }
    return "";
  }

  function setStatus(message, kind) {
    els.saveStatus.textContent = message;
    els.saveStatus.classList.remove("is-error", "is-ok");
    if (kind) els.saveStatus.classList.add(kind);
  }

  function setGateStatus(message, kind) {
    els.gateStatus.textContent = message || "";
    els.gateStatus.classList.remove("is-error", "is-ok");
    if (kind) els.gateStatus.classList.add(kind);
  }

  function clearFieldErrors() {
    document.querySelectorAll(".field-error").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll("[data-vendor-access-error]").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll(".field.is-invalid").forEach((el) => {
      el.classList.remove("is-invalid");
    });
    els.completeBy.classList.remove("is-invalid");
  }

  function showFieldError(name, message) {
    const errorEl = document.querySelector(`[data-error-for="${name}"]`);
    const field = document.querySelector(`[data-field="${name}"]`);
    if (errorEl) errorEl.textContent = message;
    if (field) field.classList.add("is-invalid");
    if (name === "complete_by") els.completeBy.classList.add("is-invalid");
  }

  function dateDisplayOf(name) {
    if (name === "complete_by") return els.completeBy.value.trim();
    const el = els.form.elements.namedItem(name);
    if (!el || el instanceof RadioNodeList) return "";
    return String(el.value || "").trim();
  }

  function dateIsoOf(name) {
    return normalizeDateToIso(dateDisplayOf(name));
  }

  function requireFilled(errors, name, message) {
    if (!valueOf(name)) errors[name] = message;
  }

  function requireRadio(errors, name, message) {
    if (!valueOf(name)) errors[name] = message;
  }

  function isNaAnswer(value) {
    return /^(n\/?a|none|no|n\.a\.?)$/i.test(String(value || "").trim());
  }

  function validateSubmitFull(errors, data) {
    if (!data.complete_by) {
      errors.complete_by = "Complete-by date is missing. Ask your coordinator for a link with the deadline.";
    }
    if (!isValidEmail(data.email)) errors.email = "Enter a valid email address.";
    if (!isValidPhone(data.phone)) errors.phone = "Enter a 10-digit phone number.";

    requireFilled(errors, "wedding_venue", "Enter the ceremony venue.");
    if (!isValidTime(valueOf("ceremony_time"))) errors.ceremony_time = "Enter the ceremony time.";
    requireFilled(errors, "reception_venue", "Enter the reception venue.");
    if (!isValidTime(valueOf("reception_time"))) errors.reception_time = "Enter the reception time.";
    if (!dateIsoOf("group_arrival")) errors.group_arrival = "Select the group arrival date.";
    if (!dateIsoOf("group_departure")) errors.group_departure = "Select the group departure date.";
    requireFilled(errors, "weekend_contact_name", "Enter the weekend contact name.");
    if (!isValidPhone(valueOf("weekend_contact_phone"))) {
      errors.weekend_contact_phone = "Enter a valid weekend contact phone.";
    }

    const guests = valueOf("guests");
    if (guests === "" || !isValidNumeric(guests, false)) {
      errors.guests = "Enter the guest room block count.";
    }
    requireFilled(errors, "couple_accommodations", "Describe accommodations for the couple.");
    requireFilled(errors, "anticipated_rooms", "Enter guest notes (or N/A).");
    requireFilled(errors, "vip_names", "Enter VIP names (or N/A).");
    requireFilled(errors, "accessibility", "Enter accessibility notes (or N/A).");

    requireRadio(errors, "getting_ready_needed", "Select whether a getting-ready room is needed.");
    if (valueOf("getting_ready_needed") === "yes") {
      const rr = valueOf("getting_ready_guests");
      if (rr === "" || !isValidNumeric(rr, false)) {
        errors.getting_ready_guests = "Enter ready room guest count.";
      }
    }

    requireFilled(errors, "transport_company", "Enter the transportation company (or N/A).");
    if (!isNaAnswer(valueOf("transport_company"))) {
      if (!isValidPhone(valueOf("transport_contact"))) {
        errors.transport_contact = "Enter a valid transport contact phone.";
      }
      requireFilled(errors, "transport_vehicles", "Enter number / type of vehicles.");
      if (!normalizeDateTimeLocal(valueOf("transport_first_pickup"))) {
        errors.transport_first_pickup = "Enter the first hotel pickup date/time.";
      }
      if (!isValidTime(valueOf("transport_additional"))) {
        errors.transport_additional = "Enter the additional pickup time.";
      }
      if (!isValidTime(valueOf("transport_return"))) {
        errors.transport_return = "Enter the expected return time.";
      }
      requireFilled(errors, "transport_venue", "Enter the wedding venue for shuttle.");
    }

    requireRadio(errors, "valet_needed", "Select whether valet is needed.");
    if (valueOf("valet_needed") === "yes") {
      requireRadio(errors, "valet_payment", "Select a parking arrangement.");
      if (valueOf("valet_payment") === "other") {
        requireFilled(errors, "valet_other", "Describe the other parking arrangement.");
      }
      const vv = valueOf("valet_vehicles");
      if (vv === "" || !isValidNumeric(vv, false)) errors.valet_vehicles = "Enter estimated vehicles.";
      requireFilled(errors, "valet_billing_contact", "Enter the billing contact.");
      requireFilled(errors, "valet_billing_instructions", "Enter billing instructions.");
    }

    requireRadio(errors, "bags_providing", "Select whether you will provide gift bags.");
    if (valueOf("bags_providing") === "yes") {
      const bq = valueOf("bags_quantity");
      if (bq === "" || !isValidNumeric(bq, false)) errors.bags_quantity = "Enter estimated bag quantity.";
      if (!dateIsoOf("bags_delivery_date")) errors.bags_delivery_date = "Select gift bag delivery date.";
      if (!isValidTime(valueOf("bags_delivery_time"))) {
        errors.bags_delivery_time = "Enter gift bag delivery time.";
      }
      requireFilled(errors, "bags_deliverer", "Enter who is delivering the bags.");
      requireFilled(errors, "bags_distribution", "Enter distribution instructions.");
    }

    requireRadio(errors, "brunch_hosting", "Select whether you will host a brunch.");
    if (valueOf("brunch_hosting") === "yes") {
      const brunch = normalizeDateTimeLocal(valueOf("brunch_datetime")) || valueOf("brunch_datetime");
      if (!brunch || !isValidDateTimeLocal(brunch)) {
        errors.brunch_datetime = "Enter brunch date and time.";
      }
      const ba = valueOf("brunch_attendance");
      if (ba === "" || !isValidNumeric(ba, false)) errors.brunch_attendance = "Enter estimated attendance.";
      requireRadio(errors, "brunch_menu_submitted", "Select whether the brunch menu was submitted.");
      requireFilled(errors, "brunch_requests", "Enter brunch special requests (or N/A).");
    }

    let vendorOk = false;
    document.querySelectorAll("[data-vendor-row]").forEach((row, idx) => {
      const company = row.querySelector('[data-vendor="company"]').value.trim();
      const service = row.querySelector('[data-vendor="service"]').value.trim();
      const access = row.querySelector('[data-vendor="access"]');
      const accessRaw = access ? String(access.value || "").trim() : "";
      const errEl = row.querySelector("[data-vendor-access-error]");
      if (!company && !service && !accessRaw) return;
      if (isNaAnswer(company)) {
        vendorOk = true;
        if (errEl) errEl.textContent = "";
        return;
      }
      vendorOk = true;
      if (!company || !service || !accessRaw || (!isValidDateTimeLocal(accessRaw) && !normalizeDateTimeLocal(accessRaw))) {
        errors["vendor_access_" + idx] = "invalid";
        if (errEl) errEl.textContent = "Complete company, service, and access date/time (or put N/A in company).";
        const wrap = access && access.closest(".field");
        if (wrap) wrap.classList.add("is-invalid");
      } else if (errEl) {
        errEl.textContent = "";
      }
    });
    if (!vendorOk) {
      errors.vendors = "Add at least one vendor, or enter N/A in the vendor company field.";
    }

    /* Staff important dates only. Staff Task List is list-only — never required here. */
    if (staffMode) {
      if (!dateIsoOf("date_room_cutoff")) errors.date_room_cutoff = "Guest room cutoff is required.";
      if (!dateIsoOf("date_menu_due")) errors.date_menu_due = "Menu selections due is required.";
      if (!dateIsoOf("date_vendor_list")) errors.date_vendor_list = "Final vendor list due is required.";
      if (!dateIsoOf("date_gift_bag")) errors.date_gift_bag = "Gift bag delivery date is required.";
    }
  }

  function validateIdentity(mode) {
    clearFieldErrors();
    syncDerivedDates();
    const data = {
      couple_name: valueOf("couple_name"),
      wedding_date: dateIsoOf("wedding_date"),
      complete_by: dateIsoOf("complete_by"),
      email: valueOf("email"),
      phone: valueOf("phone"),
    };
    const errors = {};

    if (!data.couple_name) errors.couple_name = "Enter the couple or party name.";
    if (!data.wedding_date) errors.wedding_date = "Select a wedding date.";

    if (mode === "submit") {
      validateSubmitFull(errors, data);
    } else if (staffMode) {
      if (data.email && !isValidEmail(data.email)) errors.email = "Enter a valid email address.";
      if (data.phone && !isValidPhone(data.phone)) errors.phone = "Enter a 10-digit phone number.";
    } else {
      if (!isValidEmail(data.email)) errors.email = "Enter your email so we can send a resume link.";
      if (data.phone && !isValidPhone(data.phone)) errors.phone = "Enter a 10-digit phone number.";
    }

    [
      ["group_arrival", "group arrival"],
      ["group_departure", "group departure"],
      ["bags_delivery_date", "gift bag delivery date"],
      ["date_room_cutoff", "guest room cutoff"],
      ["date_menu_due", "menu selections due"],
      ["date_vendor_list", "final vendor list due"],
      ["date_gift_bag", "gift bag delivery"],
      ["date_getting_ready", "getting-ready room access date"],
    ].forEach(([name, label]) => {
      const raw = dateDisplayOf(name);
      if (raw && !dateIsoOf(name)) errors[name] = "Select a valid " + label + ".";
    });

    if (mode !== "submit") {
      [
        ["weekend_contact_phone", "weekend contact phone"],
        ["transport_contact", "transport contact phone"],
      ].forEach(([name, label]) => {
        const v = valueOf(name);
        if (v && !isValidPhone(v)) errors[name] = "Enter a valid 10-digit " + label + ".";
      });

      [
        ["ceremony_time", "ceremony time"],
        ["reception_time", "reception time"],
        ["bags_delivery_time", "gift bag delivery time"],
        ["transport_additional", "additional pickup time"],
        ["transport_return", "return time"],
      ].forEach(([name, label]) => {
        const v = valueOf(name);
        if (v && !isValidTime(v)) errors[name] = "Enter a valid " + label + ".";
      });

      [
        ["transport_first_pickup", "first hotel pickup"],
        ["brunch_datetime", "brunch date and time"],
      ].forEach(([name, label]) => {
        const v = valueOf(name);
        if (v && !isValidDateTimeLocal(v) && !normalizeDateTimeLocal(v)) {
          errors[name] = "Enter a valid " + label + ".";
        }
      });

      ["guests", "getting_ready_guests", "valet_vehicles", "bags_quantity", "brunch_attendance"].forEach((name) => {
        const v = valueOf(name);
        if (v && !isValidNumeric(v, true)) errors[name] = "Enter numbers only.";
      });

      document.querySelectorAll("[data-vendor-row]").forEach((row, idx) => {
        const access = row.querySelector('[data-vendor="access"]');
        const errEl = row.querySelector("[data-vendor-access-error]");
        if (!access) return;
        const raw = String(access.value || "").trim();
        if (raw && !isValidDateTimeLocal(raw) && !normalizeDateTimeLocal(raw)) {
          errors["vendor_access_" + idx] = "invalid";
          if (errEl) errEl.textContent = "Enter a valid access date and time.";
          const wrap = access.closest(".field");
          if (wrap) wrap.classList.add("is-invalid");
        } else if (errEl) {
          errEl.textContent = "";
        }
      });
    }

    const arrival = dateIsoOf("group_arrival");
    const departure = dateIsoOf("group_departure");
    if (arrival && departure && compareIso(departure, arrival) < 0) {
      errors.group_departure = "Departure cannot be before arrival.";
    }
    if (data.wedding_date && arrival && compareIso(arrival, data.wedding_date) > 0) {
      errors.group_arrival = "Arrival is after the wedding date.";
    }
    if (data.wedding_date && departure && compareIso(departure, data.wedding_date) < 0) {
      errors.group_departure = "Departure is before the wedding date.";
    }
    const brunchNorm = normalizeDateTimeLocal(valueOf("brunch_datetime"));
    if (brunchNorm && data.wedding_date && valueOf("brunch_hosting") === "yes") {
      const brunchIso = brunchNorm.slice(0, 10);
      if (brunchIso && compareIso(brunchIso, data.wedding_date) < 0) {
        errors.brunch_datetime = "Brunch date is before the wedding date.";
      }
    }

    Object.keys(errors).forEach((key) => {
      if (key.indexOf("vendor_access_") === 0) return;
      showFieldError(key, errors[key]);
    });
    return { ok: Object.keys(errors).length === 0, data, errors };
  }

  function valueOf(name) {
    const el = els.form.elements.namedItem(name);
    if (!el) return "";
    if (el instanceof RadioNodeList || (el.length && el[0] && el[0].type === "radio")) {
      const checked = els.form.querySelector(`input[name="${name}"]:checked`);
      return checked ? checked.value : "";
    }
    return String(el.value || "").trim();
  }

  function setValue(name, value) {
    if (value == null) value = "";
    const radios = els.form.querySelectorAll(`input[type="radio"][name="${name}"]`);
    if (radios.length) {
      radios.forEach((r) => {
        r.checked = r.value === value;
      });
      radios[0].dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const el = name === "complete_by" ? els.completeBy : els.form.elements.namedItem(name);
    if (!el || el instanceof RadioNodeList) return;

    if (el.type === "date" || (el.hasAttribute && el.hasAttribute("data-date-field"))) {
      const iso = normalizeDateToIso(value) || "";
      if (el === els.completeBy) setCompleteByIso(iso);
      else el.value = iso;
      return;
    }
    if (el.hasAttribute && el.hasAttribute("data-date-mask")) {
      el.value = isoToUs(normalizeDateToIso(value) || value) || (parseUsDateParts(value) ? formatDateDisplay(value) : "");
      return;
    }
    if (el.hasAttribute && el.hasAttribute("data-phone-mask")) {
      el.value = formatPhoneDisplay(value);
      return;
    }
    if (el.type === "datetime-local" || (el.hasAttribute && el.hasAttribute("data-datetime-input"))) {
      el.value = normalizeDateTimeLocal(value) || "";
      return;
    }
    if (el.type === "time" || (el.hasAttribute && el.hasAttribute("data-time-input"))) {
      const t = String(value || "").trim();
      el.value = isValidTime(t) ? t.slice(0, 5) : "";
      return;
    }
    el.value = value;
  }

  function collectVendors() {
    return Array.from(els.vendorRows.querySelectorAll("[data-vendor-row]")).map((row) => {
      const accessRaw = row.querySelector('[data-vendor="access"]').value.trim();
      return {
        company: row.querySelector('[data-vendor="company"]').value.trim(),
        service: row.querySelector('[data-vendor="service"]').value.trim(),
        access: normalizeDateTimeLocal(accessRaw) || accessRaw,
      };
    });
  }

  function addVendorRow(data) {
    const node = els.vendorTemplate.content.cloneNode(true);
    const row = node.querySelector("[data-vendor-row]");
    if (data) {
      row.querySelector('[data-vendor="company"]').value = data.company || "";
      row.querySelector('[data-vendor="service"]').value = data.service || "";
      const accessEl = row.querySelector('[data-vendor="access"]');
      accessEl.value = normalizeDateTimeLocal(data.access) || "";
    }
    row.querySelector("[data-remove-vendor]").addEventListener("click", () => {
      row.remove();
      markDirty();
    });
    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", markDirty);
      input.addEventListener("change", markDirty);
    });
    els.vendorRows.appendChild(row);
  }

  function collectPayload() {
    const fields = [
      "couple_name",
      "email",
      "phone",
      "wedding_venue",
      "ceremony_time",
      "reception_venue",
      "reception_time",
      "weekend_contact_name",
      "weekend_contact_phone",
      "guests",
      "anticipated_rooms",
      "couple_accommodations",
      "getting_ready_needed",
      "getting_ready_guests",
      "vip_names",
      "accessibility",
      "transport_company",
      "transport_contact",
      "transport_vehicles",
      "transport_first_pickup",
      "transport_additional",
      "transport_return",
      "transport_venue",
      "valet_needed",
      "valet_payment",
      "valet_other",
      "valet_vehicles",
      "valet_billing_contact",
      "valet_billing_instructions",
      "bags_providing",
      "bags_quantity",
      "bags_delivery_time",
      "bags_deliverer",
      "bags_distribution",
      "brunch_hosting",
      "brunch_datetime",
      "brunch_attendance",
      "brunch_menu_submitted",
      "brunch_requests",
    ];

    const payload = {
      complete_by: dateIsoOf("complete_by"),
      wedding_date: dateIsoOf("wedding_date"),
      group_arrival: dateIsoOf("group_arrival"),
      group_departure: dateIsoOf("group_departure"),
      bags_delivery_date: dateIsoOf("bags_delivery_date"),
      date_room_cutoff: dateIsoOf("date_room_cutoff"),
      date_menu_due: dateIsoOf("date_menu_due"),
      date_vendor_list: dateIsoOf("date_vendor_list"),
      date_gift_bag: dateIsoOf("date_gift_bag"),
      date_getting_ready: dateIsoOf("date_getting_ready"),
    };

    fields.forEach((name) => {
      let v = valueOf(name);
      if (name === "phone" || name === "weekend_contact_phone" || name === "transport_contact") {
        const d = digitsOnly(v, 10);
        v = d.length === 10 ? formatPhoneDisplay(d) : v;
      }
      if (name === "brunch_datetime" || name === "transport_first_pickup") {
        v = normalizeDateTimeLocal(v) || v;
      }
      if (
        name === "ceremony_time" ||
        name === "reception_time" ||
        name === "bags_delivery_time" ||
        name === "transport_additional" ||
        name === "transport_return"
      ) {
        v = isValidTime(v) ? v.slice(0, 5) : v;
      }
      payload[name] = v;
    });
    payload.vendors = collectVendors();
    return payload;
  }

  function applyPayload(payload) {
    if (!payload || typeof payload !== "object") return;
    autoCompleteBy = false;
    Object.keys(payload).forEach((key) => {
      if (key === "vendors") return;
      setValue(key, payload[key]);
    });
    els.vendorRows.innerHTML = "";
    const vendors = Array.isArray(payload.vendors) ? payload.vendors : [];
    if (vendors.length === 0) addVendorRow();
    else vendors.forEach((v) => addVendorRow(v));
    syncConditionals();
    const wedding = dateIsoOf("wedding_date");
    const expectedComplete = wedding ? addDaysIso(wedding, -30) : "";
    autoCompleteBy = !dateIsoOf("complete_by") || dateIsoOf("complete_by") === expectedComplete;
    if (!dateIsoOf("date_room_cutoff") || !dateIsoOf("date_menu_due") || !dateIsoOf("date_vendor_list") || !dateIsoOf("date_gift_bag")) {
      syncImportantDates();
    }
    updateBeyond30Warning();
    dirty = false;
  }

  function syncConditionals() {
    toggle("getting-ready-details", valueOf("getting_ready_needed") === "yes");
    toggle("valet-details", valueOf("valet_needed") === "yes");
    toggle("bags-details", valueOf("bags_providing") === "yes");
    toggle("brunch-details", valueOf("brunch_hosting") === "yes");
  }

  function toggle(id, show) {
    const el = document.getElementById(id);
    if (el) el.hidden = !show;
  }

  function markDirty() {
    dirty = true;
    if (els.saveStatus.textContent === "All changes saved" || els.saveStatus.classList.contains("is-ok")) {
      setStatus("Unsaved changes", null);
    }
  }

  function todayIso() {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function updateBeyond30Warning() {
    const wedding = dateIsoOf("wedding_date");
    if (!wedding || !els.beyond30) {
      if (els.beyond30) els.beyond30.hidden = true;
      return;
    }
    const cutoff = addDaysIso(wedding, -30);
    if (!cutoff) {
      els.beyond30.hidden = true;
      return;
    }
    const today = todayIso();
    const complete = dateIsoOf("complete_by");
    /* Warn if today is inside the 30-day window (or later), or complete-by is after that cutoff. */
    const withinThirtyOfWedding = compareIso(today, cutoff) > 0;
    const completeAfterCutoff = complete && compareIso(complete, cutoff) > 0;
    els.beyond30.hidden = !(withinThirtyOfWedding || completeAfterCutoff);
  }

  function setCompleteByIso(iso) {
    if (!els.completeBy || !iso) return;
    const wasReadOnly = els.completeBy.readOnly;
    /* Chrome often ignores .value writes while type=date is readonly */
    els.completeBy.readOnly = false;
    els.completeBy.value = iso;
    els.completeBy.readOnly = wasReadOnly;
  }

  function maybeAutoCompleteBy() {
    if (!autoCompleteBy && els.completeBy.value.trim()) {
      updateBeyond30Warning();
      return;
    }
    const wedding = dateIsoOf("wedding_date");
    if (!wedding) {
      updateBeyond30Warning();
      return;
    }
    if (!els.completeBy.value.trim() || autoCompleteBy) {
      setCompleteByIso(addDaysIso(wedding, -30));
      autoCompleteBy = true;
    }
    updateBeyond30Warning();
  }

  function syncImportantDates() {
    const wedding = dateIsoOf("wedding_date");
    const complete = dateIsoOf("complete_by");
    if (complete) {
      setValue("date_room_cutoff", complete);
      setValue("date_menu_due", complete);
    }
    if (wedding) {
      setValue("date_vendor_list", addDaysIso(wedding, -14));
      setValue("date_gift_bag", addDaysIso(wedding, -1));
    }
  }

  function syncDerivedDates() {
    maybeAutoCompleteBy();
    syncImportantDates();
  }

  function applyStaffUi() {
    document.querySelectorAll("[data-staff-only]").forEach((el) => {
      el.hidden = !staffMode;
    });
    if (els.staffBadge) els.staffBadge.hidden = !staffMode;
    if (els.completeBy) {
      els.completeBy.readOnly = !staffMode;
      els.completeBy.classList.toggle("is-readonly", !staffMode);
    }
  }

  function setStaffMode(on) {
    staffMode = !!on;
    sessionStorage.setItem(STAFF_KEY, staffMode ? "1" : "0");
    applyStaffUi();
  }

  function applyInviteParams() {
    const params = new URLSearchParams(window.location.search);
    const wedding = params.get("wedding_date");
    const complete = params.get("complete_by");
    if (wedding) {
      const iso = normalizeDateToIso(wedding);
      if (iso) setValue("wedding_date", iso);
    }
    if (complete) {
      const iso = normalizeDateToIso(complete);
      if (iso) {
        setValue("complete_by", iso);
        autoCompleteBy = false;
      }
      syncImportantDates();
    } else if (wedding) {
      autoCompleteBy = true;
      syncDerivedDates();
    }
    updateBeyond30Warning();
  }

  function syncUrlDraftParams(draftId) {
    const url = new URL(window.location.href);
    if (draftId) url.searchParams.set("draft", draftId);
    const wd = dateIsoOf("wedding_date");
    const cb = dateIsoOf("complete_by");
    if (wd) url.searchParams.set("wedding_date", wd);
    if (cb) url.searchParams.set("complete_by", cb);
    window.history.replaceState({}, "", url.toString());
  }

  async function api(action, body) {
    if (mockMode()) {
      return mockApi(action, body);
    }

    if (!apiConfigured()) {
      throw new Error(
        "API_URL is not configured yet. Paste your Power Automate HTTP URL into config.js (or turn on MOCK_MODE)."
      );
    }

    const res = await fetch(cfg.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...body }),
      redirect: "follow",
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Unexpected response from server. Check Power Automate deployment and Response action.");
    }
    if (!data.ok) {
      throw new Error(formatApiError(data, res.status));
    }
    return data;
  }

  function formatApiError(data, status) {
    const err = data && data.error;
    if (typeof err === "string" && err.trim()) return err;
    if (err && typeof err === "object") {
      if (typeof err.message === "string" && err.message.trim()) return err.message;
      if (typeof err.code === "string" && err.code.trim()) {
        return err.message ? `${err.code}: ${err.message}` : err.code;
      }
      try {
        return JSON.stringify(err);
      } catch {
        /* fall through */
      }
    }
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (status && status >= 400) return `Request failed (HTTP ${status}). Check Power Automate run history.`;
    return "Request failed. Check Power Automate run history.";
  }

  function unlockUi() {
    sessionStorage.setItem(SESSION_KEY, "1");
    els.gate.hidden = true;
    els.app.hidden = false;
    els.app.classList.remove("is-locked");
    applyStaffUi();
    applyInviteParams();
  }

  function showThanks(draftId) {
    els.app.hidden = true;
    els.gate.hidden = true;
    els.thanks.hidden = false;
    els.thanksDraft.textContent = draftId ? `Reference: ${draftId}` : "";
  }

  async function handleUnlock(event) {
    event.preventDefault();
    setGateStatus("");
    const password = els.accessPassword.value;
    if (!password) {
      showFieldError("password", "Enter the access code.");
      return;
    }
    els.unlockForm.querySelector('[data-error-for="password"]').textContent = "";
    try {
      const data = await api("unlock", { password });
      sessionPassword = password;
      sessionStorage.setItem(PASSWORD_KEY, password);
      setStaffMode(data.staff === true);
      unlockUi();
      const params = new URLSearchParams(window.location.search);
      const draft = params.get("draft");
      if (draft) await loadDraftById(draft);
    } catch (err) {
      setGateStatus(err.message, "is-error");
    }
  }

  async function loadDraftById(draftId) {
    try {
      setStatus("Loading saved progress…");
      const data = await api("loadDraft", {
        password: sessionPassword,
        draft_id: draftId,
      });
      els.draftId.value = data.draft_id || draftId;
      applyPayload(data.payload);
      syncUrlDraftParams(data.draft_id || draftId);
      setStatus("Loaded saved progress", "is-ok");
      dirty = false;
    } catch (err) {
      setStatus(err.message, "is-error");
    }
  }

  async function handleResume(event) {
    event.preventDefault();
    setGateStatus("");
    const password = els.accessPassword.value;
    const email = document.getElementById("resume-email").value.trim();
    const weddingRaw = document.getElementById("resume-wedding-date").value;
    const wedding_date = normalizeDateToIso(weddingRaw);

    let ok = true;
    if (!password) {
      showFieldError("password", "Enter the access code.");
      ok = false;
    }
    if (!isValidEmail(email)) {
      showFieldError("resume_email", "Enter a valid email.");
      ok = false;
    }
    if (!wedding_date) {
      showFieldError("resume_wedding_date", "Select a valid wedding date.");
      ok = false;
    }
    if (!ok) return;

    try {
      const data = await api("loadDraft", { password, email, wedding_date });
      sessionPassword = password;
      sessionStorage.setItem(PASSWORD_KEY, password);
      let staff = data.staff === true;
      if (!staff) {
        try {
          const unlockData = await api("unlock", { password });
          staff = unlockData.staff === true;
        } catch {
          staff = false;
        }
      }
      setStaffMode(staff);
      unlockUi();
      els.draftId.value = data.draft_id || "";
      applyPayload(data.payload);
      if (data.draft_id) syncUrlDraftParams(data.draft_id);
      setStatus("Loaded saved progress", "is-ok");
    } catch (err) {
      setGateStatus(err.message, "is-error");
    }
  }

  async function saveDraft() {
    if (saving) return null;
    updateBeyond30Warning();
    const validation = validateIdentity("save");
    if (!validation.ok) {
      setStatus("Fix the highlighted fields before saving.", "is-error");
      const first = document.querySelector(".field.is-invalid, .intro-date.is-invalid");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return null;
    }

    saving = true;
    setStatus("Saving…");
    try {
      const payload = collectPayload();
      const data = await api("saveDraft", {
        password: sessionPassword,
        draft_id: els.draftId.value || undefined,
        payload,
        form_url: window.location.origin + window.location.pathname,
        staff: staffMode,
      });
      els.draftId.value = data.draft_id;
      dirty = false;
      syncUrlDraftParams(data.draft_id);
      const when = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setStatus(
        mockMode()
          ? `Saved ${when} (mock mode — this browser only).`
          : staffMode
            ? `Saved ${when} (staff — list only, no email).`
            : `Saved ${when}. Check your email for a resume link.`,
        "is-ok"
      );
      return data;
    } catch (err) {
      setStatus(err.message, "is-error");
      return null;
    } finally {
      saving = false;
    }
  }

  async function submitFinal() {
    updateBeyond30Warning();
    const validation = validateIdentity("submit");
    if (!validation.ok) {
      setStatus("Fix the highlighted fields before submitting.", "is-error");
      const first = document.querySelector(".field.is-invalid, .intro-date.is-invalid");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!window.confirm("Submit your final room block details? You can still contact your coordinator with updates afterward.")) {
      return;
    }

    saving = true;
    setStatus("Submitting…");
    try {
      const payload = collectPayload();
      const data = await api("submitFinal", {
        password: sessionPassword,
        draft_id: els.draftId.value || undefined,
        payload,
        form_url: window.location.origin + window.location.pathname,
        staff: staffMode,
      });
      dirty = false;
      showThanks(data.draft_id);
    } catch (err) {
      setStatus(err.message, "is-error");
    } finally {
      saving = false;
    }
  }

  function enhanceNumberSteppers() {
    document.querySelectorAll("input[data-numeric]").forEach((input) => {
      if (input.closest(".number-stepper")) return;
      input.type = "number";
      if (!input.min) input.min = "0";
      if (!input.step) input.step = "1";
      const wrap = document.createElement("div");
      wrap.className = "number-stepper";
      const dec = document.createElement("button");
      dec.type = "button";
      dec.className = "number-stepper-btn";
      dec.setAttribute("aria-label", "Decrease");
      dec.textContent = "−";
      const inc = document.createElement("button");
      inc.type = "button";
      inc.className = "number-stepper-btn";
      inc.setAttribute("aria-label", "Increase");
      inc.textContent = "+";
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(dec);
      wrap.appendChild(input);
      wrap.appendChild(inc);
      const stepBy = (delta) => {
        const min = Number(input.min || 0);
        const cur = input.value === "" ? min : Number(input.value);
        const next = Math.max(min, (Number.isFinite(cur) ? cur : min) + delta);
        input.value = String(next);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        markDirty();
      };
      dec.addEventListener("click", () => stepBy(-1));
      inc.addEventListener("click", () => stepBy(1));
    });
  }

  function wireMasks() {
    enhanceNumberSteppers();

    document.querySelectorAll("[data-phone-mask]").forEach((input) => {
      input.addEventListener("input", () => {
        const start = input.selectionStart;
        const before = input.value;
        input.value = formatPhoneDisplay(input.value);
        if (document.activeElement === input && typeof start === "number") {
          const diff = input.value.length - before.length;
          const pos = Math.max(0, start + diff);
          try {
            input.setSelectionRange(pos, pos);
          } catch {
            /* ignore */
          }
        }
        markDirty();
      });
      input.addEventListener("blur", () => {
        const raw = input.value.trim();
        if (raw && !isValidPhone(raw)) {
          input.classList.add("is-invalid");
        } else {
          input.classList.remove("is-invalid");
          if (raw) input.value = formatPhoneDisplay(raw);
        }
      });
    });

    document.querySelectorAll("input[type='date']").forEach((input) => {
      if (!input.min) input.min = "2000-01-01";
      if (!input.max) input.max = "2100-12-31";
      const onDateEdit = () => {
        const iso = normalizeDateToIso(input.value);
        if (input.value && !iso) {
          /* Clear Chromium garbage years (e.g. 275760) while typing */
          input.value = "";
          return;
        }
        if (input === els.completeBy) {
          autoCompleteBy = false;
          if (iso) syncImportantDates();
          updateBeyond30Warning();
        } else if (input.id === "wedding_date") {
          if (iso) syncDerivedDates();
          else updateBeyond30Warning();
        } else {
          updateBeyond30Warning();
        }
        markDirty();
      };
      input.addEventListener("change", onDateEdit);
      input.addEventListener("input", onDateEdit);
    });

    document.querySelectorAll("[data-numeric]").forEach((input) => {
      input.addEventListener("input", () => {
        if (input.type === "number") {
          markDirty();
          return;
        }
        input.value = digitsOnly(input.value);
        markDirty();
      });
    });

    document.querySelectorAll("[data-time-input]").forEach((input) => {
      input.addEventListener("change", () => {
        const v = input.value.trim();
        if (v && !isValidTime(v)) input.classList.add("is-invalid");
        else input.classList.remove("is-invalid");
        markDirty();
      });
    });

    document.querySelectorAll("[data-datetime-input]").forEach((input) => {
      input.addEventListener("change", () => {
        const v = input.value.trim();
        if (v && !isValidDateTimeLocal(v)) input.classList.add("is-invalid");
        else input.classList.remove("is-invalid");
        markDirty();
      });
    });
  }

  function wireConditionals() {
    ["getting_ready_needed", "valet_needed", "bags_providing", "brunch_hosting"].forEach((name) => {
      els.form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
        input.addEventListener("change", () => {
          syncConditionals();
          markDirty();
        });
      });
    });
  }

  function wireDirtyTracking() {
    els.form.addEventListener("input", (e) => {
      if (e.target && (e.target.hasAttribute("data-phone-mask") || e.target.hasAttribute("data-date-mask") || e.target.hasAttribute("data-date-field") || e.target.hasAttribute("data-numeric"))) {
        return;
      }
      markDirty();
    });
    els.form.addEventListener("change", markDirty);
  }

  function applyConfigCopy() {
    if (cfg.TITLE) {
      els.formTitle.textContent = cfg.TITLE;
      document.title = cfg.TITLE + " | The LaSalle Chicago";
    }
    if (cfg.INTRO_BEFORE) els.introBefore.textContent = cfg.INTRO_BEFORE;
    if (cfg.INTRO_AFTER) els.introAfter.textContent = cfg.INTRO_AFTER;
  }

  function init() {
    applyConfigCopy();
    addVendorRow();
    wireConditionals();
    wireDirtyTracking();
    wireMasks();
    applyStaffUi();

    if (mockMode()) {
      setGateStatus(
        'Preview mode — guest "' +
          (cfg.MOCK_PASSWORD || "preview") +
          '", staff "' +
          (cfg.MOCK_STAFF_PASSWORD || "staff") +
          '".',
        "is-ok"
      );
    }

    els.unlockForm.addEventListener("submit", handleUnlock);
    els.resumeForm.addEventListener("submit", handleResume);
    els.showResume.addEventListener("click", () => {
      els.resumePanel.hidden = !els.resumePanel.hidden;
    });
    els.addVendor.addEventListener("click", () => {
      addVendorRow();
      markDirty();
    });
    els.saveBtn.addEventListener("click", () => saveDraft());
    els.saveBtnFooter.addEventListener("click", () => saveDraft());
    els.submitBtn.addEventListener("click", submitFinal);
    els.submitBtnFooter.addEventListener("click", submitFinal);

    window.addEventListener("beforeunload", (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    const already = sessionStorage.getItem(SESSION_KEY) === "1" && sessionPassword;
    if (already) {
      setStaffMode(sessionStorage.getItem(STAFF_KEY) === "1");
      unlockUi();
      const draft = new URLSearchParams(window.location.search).get("draft");
      if (draft) loadDraftById(draft);
    } else {
      els.app.hidden = true;
      els.gate.hidden = false;
    }
  }

  init();
})();
