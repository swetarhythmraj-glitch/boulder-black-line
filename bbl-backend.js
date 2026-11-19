/* =====================================================================
   BOULDER BLACK LINE — SEPARATE BACKEND BRIDGE (this site only)
   ---------------------------------------------------------------------
   Namespace:  bbl
   API base:   /api/bbl/v1/        (to be provisioned for THIS site at
                                    go-live, on Deepak's own hosting /
                                    backend — it is NOT the RideWave
                                    backend and never calls it)
   Own data store / collections (names are this site's alone):
     - bbl_quote_requests    quote requests submitted on this site
     - bbl_bookings          confirmed bookings for this site
     - bbl_owner_accounts    the owner's account for this site
     - bbl_pricing_config    this site's pricing (see bbl-pricing.js —
                             the file is the preview-time source of the
                             same values; at go-live the values move
                             into this record, still this site's alone)

   Nothing in this file reads or writes RideWave bookings, RideWave
   config, or any other owner's data. Pricing is never fetched from
   RideWave at quote time — the page uses bbl-pricing.js only.

   DEMO MODE: while no Jotform form is configured (JOTFORM.formId
   empty — see below), demoMode is true. recordQuote / recordBooking
   write ONLY to this device's local demo store (keys prefixed
   "bbl_backend_demo_"), which stands in for the bbl_* collections
   above so the owner page can show what the quote page made. No
   network write, no text, no email, no payment ever leaves the device
   in demo mode. The form IS configured below (setup completed
   2026-11-19), so demoMode is false and the live paths run.

   OWNER NOTIFICATIONS (Jotform — live setup done 2026-11-19): per
   the XYZ standard (local-xyz-owner-notifications skill, decided
   2026-11-06) the owner has his OWN free Jotform account (Starter)
   with one form built to JOTFORM-FORM-SPEC.md. This page is a custom
   quote flow (map, live pricing, airline gate) and is NOT replaced
   by a Jotform embed; instead recordBooking POSTs the booking to
   that form exactly once per customer submit, and Jotform's own
   notification system sends the SMS alert to the owner's verified
   phone + the full-detail email, plus the rider's confirmation
   email. NOTHING about the owner alert sends through the RideWave
   server or number; there is no Twilio and no A2P in the path.

   RIDER EMAILS (2026-11-19): every booking is ALSO recorded
   server-side (the bblRecordBooking Cloud Function, BBL namespace)
   so the owner page can list it and assign a driver. Assigning a
   driver sends the rider the welcome email with the driver's name,
   vehicle and plate instantly, and a reminder email goes out 12
   hours before pickup (bblSendReminders). Those two emails send
   from the BBL Cloud Functions only; the /api/bbl/v1/ REST
   endpoints named in the header above remain unprovisioned.
   ===================================================================== */
(function () {
  "use strict";
  var DEMO_QUOTES_KEY = "bbl_backend_demo_bbl_quote_requests";
  var DEMO_BOOKINGS_KEY = "bbl_backend_demo_bbl_bookings";

  /* OWNER ALERTS (Jotform) — Deepak's form "Boulder Black Line
     Booking Request", built 2026-11-19 to
     jotform-alerts-work/JOTFORM-FORM-SPEC.md; the qids below are
     that form's real field ids. The hidden "source" field is NOT
     sent by the page — the form's own default fills it in. */
  var JOTFORM = {
    formId: "263223837695063",
    submitBase: "https://submit.jotform.com/submit/",
    fields: {
      code: "q3_bookingCode",
      rider: "q4_riderName",
      phone: "q5_riderPhone",
      email: "q6_riderEmail",
      pickup: "q7_pickup",
      dropoff: "q8_dropoff",
      stop: "q9_extraStop",
      date: "q10_pickupDate",
      time: "q11_pickupTime",
      serviceName: "q12_service",
      mode: "q13_tripType",
      passengers: "q14_passengers",
      bags: "q15_bags",
      fare: "q16_fare",
      miles: "q17_miles",
      mins: "q18_tripMinutes",
      hours: "q19_hours",
      airline: "q20_airline",
      flightNumber: "q21_flightNumber",
      notes: "q22_notes",
      paymentStatus: "q23_payment"
    }
  };
  var DEMO = !JOTFORM.formId;
  var notifiedId = null;

  /* SERVER-SIDE BOOKING RECORD (2026-11-19): the same booking is
     also recorded in the BBL backend (bbl_bookings) so the owner
     page can list it, assign a driver (which sends the rider the
     welcome email instantly), and the 12-hour reminder can fire.
     Fire-and-forget with keepalive: a failed record never fails or
     delays the customer's booking — the Jotform alert above and the
     local store remain the backstops. */
  var SERVER_RECORD_URL = "https://us-central1-blackcarservice4u-57d2a.cloudfunctions.net/bblRecordBooking";
  function recordServerSide(rec) {
    try {
      if (!rec || !rec.id || !window.fetch) return;
      var payload = {};
      for (var k in rec) payload[k] = rec[k];
      window.fetch(SERVER_RECORD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(function () {}, function () {});
    } catch (e) { /* never break the booking flow */ }
  }

  /* Fire the ONE Jotform submission for a confirmed booking. A
     hidden form + hidden iframe is used (not fetch) so the POST is
     a plain cross-domain form submit: no CORS, no API key, nothing
     through any RideWave server. Fire-and-forget by design — the
     booking record is already saved before this runs, so a blocked
     or failed POST never loses the booking; the owner page remains
     the backstop list. Jotform then sends the owner's SMS + email. */
  function notifyOwner(rec) {
    if (DEMO || !rec || !rec.id || notifiedId === rec.id) return;
    notifiedId = rec.id;
    try {
      var fd = rec.fareDetail || {};
      var vals = {};
      vals[JOTFORM.fields.code] = rec.code || "";
      vals[JOTFORM.fields.rider] = rec.rider || "";
      vals[JOTFORM.fields.phone] = rec.phone || "";
      vals[JOTFORM.fields.email] = rec.email || "";
      vals[JOTFORM.fields.pickup] = rec.pickup || "";
      vals[JOTFORM.fields.dropoff] = rec.dropoff || "";
      vals[JOTFORM.fields.stop] = rec.stop || "";
      vals[JOTFORM.fields.date] = rec.date || "";
      vals[JOTFORM.fields.time] = rec.time || "";
      vals[JOTFORM.fields.serviceName] = rec.serviceName || "";
      vals[JOTFORM.fields.mode] = rec.service === "hourly" ? "Hourly" : "One Way";
      vals[JOTFORM.fields.passengers] = rec.passengers != null ? String(rec.passengers) : "";
      vals[JOTFORM.fields.bags] = rec.bags != null ? String(rec.bags) : "";
      vals[JOTFORM.fields.fare] = rec.price != null ? String(rec.price) : "";
      vals[JOTFORM.fields.miles] = fd.miles != null ? String(fd.miles) : "";
      vals[JOTFORM.fields.mins] = fd.minutes != null ? String(fd.minutes) : "";
      vals[JOTFORM.fields.hours] = fd.hours != null ? String(fd.hours) : "";
      vals[JOTFORM.fields.airline] = rec.airline || "";
      vals[JOTFORM.fields.flightNumber] = rec.flightNumber || "";
      vals[JOTFORM.fields.notes] = rec.notes || "";
      vals[JOTFORM.fields.paymentStatus] = rec.paymentStatus || "";
      var frame = document.getElementById("bblJotformFrame");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "bblJotformFrame";
        frame.name = "bblJotformFrame";
        frame.style.display = "none";
        document.body.appendChild(frame);
      }
      var form = document.createElement("form");
      form.method = "POST";
      form.action = JOTFORM.submitBase + JOTFORM.formId + "/";
      form.target = "bblJotformFrame";
      form.style.display = "none";
      var fid = document.createElement("input");
      fid.type = "hidden"; fid.name = "formID"; fid.value = JOTFORM.formId;
      form.appendChild(fid);
      for (var k in vals) {
        var inp = document.createElement("input");
        inp.type = "hidden"; inp.name = k; inp.value = vals[k];
        form.appendChild(inp);
      }
      document.body.appendChild(form);
      form.submit();
      setTimeout(function () { try { form.remove(); } catch (e) {} }, 4000);
    } catch (e) {}
  }

  function lsAppend(key, rec) {
    try {
      var all = [];
      try { all = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { all = []; }
      if (!Array.isArray(all)) all = [];
      all.push(rec);
      localStorage.setItem(key, JSON.stringify(all));
      return true;
    } catch (e) { return false; }
  }

  window.BBL_BACKEND = {
    namespace: "bbl",
    apiBase: "/api/bbl/v1/",
    endpoints: {
      quoteRequests: "/api/bbl/v1/quote-requests",
      bookings: "/api/bbl/v1/bookings",
      ownerAccounts: "/api/bbl/v1/owner-accounts",
      pricingConfig: "/api/bbl/v1/pricing-config"
    },
    collections: {
      quotes: "bbl_quote_requests",
      bookings: "bbl_bookings",
      ownerAccounts: "bbl_owner_accounts",
      pricing: "bbl_pricing_config"
    },
    demoMode: DEMO,
    /* Transport: appends to this device's store (the demo store
       while DEMO). recordBooking additionally fires the one Jotform
       owner alert per booking (see notifyOwner above) and records
       the booking server-side for the owner page, the assign
       welcome email and the 12-hour reminder (see recordServerSide
       above) — both are no-ops in demo mode. POSTs to the
       /api/bbl/v1/ endpoints above remain a separate later step;
       these signatures do not change. */
    recordQuote: function (rec) {
      var copy = {}; for (var k in rec) copy[k] = rec[k];
      copy._collection = "bbl_quote_requests"; if (DEMO) copy._demo = true;
      return lsAppend(DEMO_QUOTES_KEY, copy);
    },
    recordBooking: function (rec) {
      var copy = {}; for (var k in rec) copy[k] = rec[k];
      copy._collection = "bbl_bookings"; if (DEMO) copy._demo = true;
      var ok = lsAppend(DEMO_BOOKINGS_KEY, copy);
      notifyOwner(rec);
      if (!DEMO) recordServerSide(rec);
      return ok;
    }
  };
})();
