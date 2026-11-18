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

   DEMO MODE (preview): DEMO_MODE is true. recordQuote / recordBooking
   write ONLY to this device's local demo store (keys prefixed
   "bbl_backend_demo_"), which stands in for the bbl_* collections
   above so the owner page can show what the quote page made. No
   network write, no text, no email, no payment ever leaves the device
   in demo mode.

   OWNER NOTIFICATIONS (real build): per the XYZ standard
   (local-xyz-owner-notifications skill, decided 2026-11-06) the owner
   gets a per-owner Jotform account (free Starter) whose form is
   embedded on the owner's own domain; Jotform sends the SMS alert +
   full-detail email. NOTHING sends through the RideWave server or
   number, and there is no per-owner Twilio / A2P. That setup needs
   Deepak's own Jotform account + his one-time phone verification —
   an owner step, NOT done in this preview. Until then this site
   stays in demo / no-send mode.
   ===================================================================== */
(function () {
  "use strict";
  var DEMO_QUOTES_KEY = "bbl_backend_demo_bbl_quote_requests";
  var DEMO_BOOKINGS_KEY = "bbl_backend_demo_bbl_bookings";

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
    demoMode: true,
    /* Demo transport: appends to this device's demo store only.
       At go-live these two functions become POSTs to the endpoints
       above; their signatures do not change. */
    recordQuote: function (rec) {
      var copy = {}; for (var k in rec) copy[k] = rec[k];
      copy._collection = "bbl_quote_requests"; copy._demo = true;
      return lsAppend(DEMO_QUOTES_KEY, copy);
    },
    recordBooking: function (rec) {
      var copy = {}; for (var k in rec) copy[k] = rec[k];
      copy._collection = "bbl_bookings"; copy._demo = true;
      return lsAppend(DEMO_BOOKINGS_KEY, copy);
    }
  };
})();
