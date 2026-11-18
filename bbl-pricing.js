/* =====================================================================
   BOULDER BLACK LINE — PRICING CONFIG (this site's OWN pricing system)
   ---------------------------------------------------------------------
   One-time snapshot, taken 2026-11-17, of the fare formula and values
   the XYZ / Nobu pages ship with — which is the RideWave rider-app fare
   math those pages were built on.

   SOURCE (shipped code, repo swetarhythmraj-glitch/ridewave-web):
     - xyz-quote.html  git blob 55f5dc8005c1a3690fef97ae7ee805c75d05498f
     - xyz.html        git blob a56a49c94a15040b8db15c2b950e8ee6c8ba9951
   Both files carry a byte-identical `var FARE_CONFIG = {...}` block;
   every value below is copied from that block, nothing invented.

   ISOLATION RULE (owner order, 2026-11-17):
   This file is the ONLY pricing source for the Boulder Black Line site.
   It is a snapshot, not a link. Editing RideWave / XYZ / Nobu pricing
   does NOT change this file, and editing this file does NOT change
   RideWave / XYZ / Nobu. To change Boulder Black Line prices, edit
   THIS file (or, at go-live, this site's own `bbl_pricing_config`
   record in its own backend — see bbl-backend.js).
   ===================================================================== */
(function () {
  "use strict";
  var BBL_PRICING = {
    /* Active tier for this site (single-SUV operation, as in XYZ). */
    tier: "bsuv",
    rates: {
      x:     { base: 5,  ratePerMile: 1.30 },
      xl:    { base: 7,  ratePerMile: 1.90 },
      black: { base: 10, ratePerMile: 2.30 },
      bsuv:  { base: 12, ratePerMile: 2.90 }
    },
    airportSurcharge: { x: 10, xl: 10, black: 20, bsuv: 20 },
    longHaulAfterMiles: 50,
    longHaulPerMile: { x: 0.50, xl: 0.50, black: 0.75, bsuv: 1.00 },
    hourlyRate: 95,
    /* DIA terminal coordinates — routing uses these coordinates,
       never the airport address string (AGENTS.md standing rule). */
    diaWest: { lat: 39.8558, lng: -104.6762 },
    diaEast: { lat: 39.8558, lng: -104.6724 },
    diaBounds: { latMin: 39.83, latMax: 39.89, lngMin: -104.72, lngMax: -104.62 },
    denverCenter: { lat: 39.7392, lng: -104.9903 }
  };

  /* The shipped fare formula, copied from xyz-quote.html computedFare():
       fare = base + miles * ratePerMile
            + airportSurcharge            (if either end is an airport)
            + (miles - 50) * longHaulPerMile   (only past 50 miles)
     rounded to cents. */
  BBL_PRICING.computeFare = function (miles, hasAirport) {
    var rt = BBL_PRICING.rates[BBL_PRICING.tier];
    var fare = rt.base + miles * rt.ratePerMile;
    if (hasAirport) fare += BBL_PRICING.airportSurcharge[BBL_PRICING.tier] || 0;
    if (miles > BBL_PRICING.longHaulAfterMiles) {
      fare += (miles - BBL_PRICING.longHaulAfterMiles) * (BBL_PRICING.longHaulPerMile[BBL_PRICING.tier] || 0);
    }
    return Math.round(fare * 100) / 100;
  };

  BBL_PRICING.meta = {
    business: "Boulder Black Line",
    snapshotDate: "2026-11-17",
    sourceFiles: ["xyz.html", "xyz-quote.html"],
    sourceRepo: "swetarhythmraj-glitch/ridewave-web",
    note: "Snapshot only — no live link to RideWave pricing in either direction."
  };

  window.BBL_PRICING = BBL_PRICING;
})();
