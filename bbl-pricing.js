/* =====================================================================
   BOULDER BLACK LINE — PRICING CONFIG (this site's OWN pricing system)
   ---------------------------------------------------------------------
   Snapshot taken 2026-11-18, refreshed the same day at the owner's
   order ("make the rate same as RideWave, including mountain rides
   and Denver area and concerts and event venues"). Every value and
   rule below is copied from RideWave's CURRENT LIVE fare code:

   SOURCES (shipped code, fetched 2026-11-18):
     - ridewave-functions, functions/index.js, git blob
       17e751439ffe81247b63635c84cc2c7b48e2763c — the server fare
       oracle: RATE, DIA_SURCHARGE + the narrow DIA keyword test,
       _longDistanceSurcharge, _canonicalFare, STADIUM_ZONES /
       METRO_ZONES + _stadiumRuleFor, MOUNTAIN_ZONES +
       _mountainRuleFor, the open-country gate (_endpointCovered /
       _openCountryFor), HOURLY_FIRST_HOUR / HOURLY_RATE.
     - ridewave-web, app.html, git blob
       48f41448e533c1a719bdd4a62b1297ba844ecb22 — the rider page's
       client mirror of the same tables (numerically identical),
       fareValue(), hourlyFare(h) = 100 + 80 * (h - 1), and the
       hourly stepper's 2..12 hour clamp (the 2-hour minimum).

   WHAT THE STACK IS (applied in this order):
     1. Meter fare: base + miles x per-mile + airport surcharge +
        long-distance surcharge past 50 miles, never below base.
        BBL-ONLY CHANGE (owner order 2026-11-19, supersedes the
        DIA-only rule this snapshot was taken with): the $20
        airport surcharge fires when EITHER endpoint is ANY
        airport in the Denver metro area (the metroAirports table
        below: DEN/DIA, Centennial APA, Rocky Mountain Metro BJC,
        Colorado Air and Space Port FTG, Boulder Municipal BDU,
        Erie Municipal EIK) — charged ONCE per ride even if both
        ends are metro airports. Airports outside the metro
        (Colorado Springs, Aspen/Pitkin ASE, Eagle County EGE...)
        do NOT draw it; their rides are flat-fare or gated below.
        There is no per-minute charge (ratePerMin = 0
        on every RideWave tier) and NO flat route-pair price: the
        $140 Boulder<->DEN invoices in RideWave's history are
        admin-set prices, not a coded rule — the meter governs.
     2. Mountain flat fares: an endpoint inside a mountain zone
        with the other endpoint inside the Denver metro (or in
        another mountain zone) prices at the town's one flat fare
        for every vehicle class. Mountain <-> mountain takes the
        HIGHER town's flat, once, never double. BBL-only exception
        (owner order 2026-11-18 evening): Colorado Springs sits in
        this same table at a flat $350 — RideWave itself leaves
        Colorado Springs to the by-request gate below. Fort
        Collins sits in the same table at a flat $250 (owner
        order 2026-11-19; lowered from $300 on 2026-11-20) — RideWave gates it the same way.
        Castle Rock and Evergreen (including Evergreen Lake)
        sit in the same table at a flat $250 each (owner order
        2026-11-20), on the same terms.
     3. Stadium / venue fare: an endpoint inside a stadium zone
        with the other endpoint inside the metro prices FLAT $200;
        with the other endpoint outside the metro, the meter fare
        stands with a $200 minimum. Both endpoints in zones = one
        $200, never double.
     4. Admin-request gate: an endpoint provably outside the metro
        union, the mountain zones and the stadium zones is "open
        country" — the ride has NO instant price (priceRide returns
        fare: null); the customer calls or texts and the office
        quotes it, exactly as RideWave's closed list works.
     Stops never trigger any zone rule — only pickup and drop-off
     are tested.
     5. Hourly eligibility (owner order 2026-11-20): hourly is a
        Denver-metro product only. An hourly charter prices by the
        hour ONLY when both endpoints are covered (the same closed
        list as the gate in 4) AND no flat-fare zone governs the
        ride AND no stadium / venue zone governs it either (owner
        order 2026-11-20, the venue extension). If either endpoint
        sits in a flat-fare zone, the flat fare governs — never
        the hourly rate; if either endpoint sits in a stadium
        zone, the venue fare in 3 governs — never the hourly rate;
        if either endpoint is covered by nothing, the gate in 4
        governs in every mode. hourlyEligibility() below is the
        test; the page enforces it in its fare path and falls back
        to Point To Point when it answers no.

   ISOLATION RULE (owner order, 2026-11-17):
   This file is the ONLY pricing source for the Boulder Black Line
   site. It is a snapshot, not a link. Editing RideWave pricing does
   NOT change this file, and editing this file does NOT change
   RideWave. To change Boulder Black Line prices, edit THIS file
   (or, at go-live, this site's own `bbl_pricing_config` record in
   its own backend — see bbl-backend.js).
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
    /* Airport surcharge by tier — charged once when either
       endpoint is a Denver-metro airport (metroAirports table +
       airportSurchargeFor below; owner order 2026-11-19). */
    airportSurcharge: { x: 10, xl: 10, black: 20, bsuv: 20 },
    diaKeywords: [
      "denver international", "denver int", "denver airport",
      "international airport", "peña blvd", "pena blvd", "8500 pe",
      "(den)", "denver, co 80249"
    ],
    longHaulAfterMiles: 50,
    longHaulPerMile: { x: 0.50, xl: 0.50, black: 0.75, bsuv: 1.00 },
    /* Hourly — RideWave's published model: first hour $100, each
       additional hour $80, 2-hour minimum (the $180 two-hour floor),
       up to 12 hours. Deliberately NOT tier-based. */
    hourlyFirstHour: 100,
    hourlyRate: 80,
    hourlyMinHours: 2,
    hourlyMaxHours: 12,
    /* Stadium / venue fare (RideWave, owner Nov 17, 2026). */
    stadiumFare: 200,
    /* The admin-request gate is ON, mirroring RideWave's closed
       list. The message carries THIS business's own number. */
    adminRequestGate: true,
    adminRequestMsg: "This trip is booked by request. Call or text (720) 326-4652 and we will quote it for you.",
    /* DIA terminal coordinates — routing uses these coordinates,
       never the airport address string (AGENTS.md standing rule). */
    diaWest: { lat: 39.8558, lng: -104.6762 },
    diaEast: { lat: 39.8558, lng: -104.6724 },
    diaBounds: { latMin: 39.83, latMax: 39.89, lngMin: -104.72, lngMax: -104.62 },
    denverCenter: { lat: 39.7392, lng: -104.9903 }
  };

  /* Denver-metro airports (BBL-only table, owner order
     2026-11-19): a regular (meter) ride with a pickup OR drop-off
     at any of these draws the one-time airportSurcharge above.
     Detection is by endpoint coordinates within radiusM of the
     airport centre, OR by the specific airport name / code
     keywords — never the bare city words ("centennial",
     "boulder", "erie", "rocky mountain" alone do NOT trigger),
     and never a generic "airport" word, so non-metro airports
     (Colorado Springs, Aspen/Pitkin, Eagle County) return no
     match here. DEN keeps its wider existing keyword list
     (diaKeywords + the DIA/DEN short tokens). */
  BBL_PRICING.metroAirports = [
    { code: "DEN", name: "Denver International Airport",          lat: 39.8561, lng: -104.6737, radiusM: 2000, names: ["denver international", "denver int", "denver airport", "international airport", "peña blvd", "pena blvd", "8500 pe", "(den)", "denver, co 80249"] },
    { code: "APA", name: "Centennial Airport",                    lat: 39.5701, lng: -104.8493, radiusM: 2000, names: ["centennial airport", "(apa)"] },
    { code: "BJC", name: "Rocky Mountain Metropolitan Airport",   lat: 39.9088, lng: -105.1172, radiusM: 2000, names: ["rocky mountain metropolitan airport", "jeffco airport", "(bjc)"] },
    { code: "FTG", name: "Colorado Air and Space Port",           lat: 39.7853, lng: -104.5433, radiusM: 2000, names: ["colorado air and space port", "front range airport", "(ftg)", "(cfo)"] },
    { code: "BDU", name: "Boulder Municipal Airport",             lat: 40.0394, lng: -105.2258, radiusM: 2000, names: ["boulder municipal airport", "(bdu)"] },
    { code: "EIK", name: "Erie Municipal Airport",                lat: 40.0101, lng: -105.0475, radiusM: 2000, names: ["erie municipal airport", "(eik)"] }
  ];

  /* Stadium zones — centre + radius circles, copied from the live
     RideWave tables (backend + rider page, identical). Centres are
     the venues' own published listing points. */
  BBL_PRICING.stadiumZones = [
    { name: "Empower Field at Mile High", lat: 39.743987, lng: -105.020102, radiusM: 1000, names: ["empower field", "mile high", "broncos stadium", "1701 bryant"] },
    { name: "Ball Arena",                 lat: 39.74864,  lng: -105.007786, radiusM: 750,  names: ["ball arena", "pepsi center", "1000 chopper"] },
    { name: "Coors Field",                lat: 39.755992, lng: -104.994174, radiusM: 900,  names: ["coors field", "2001 blake"] },
    { name: "Dick's Sporting Goods Park", lat: 39.805662, lng: -104.891804, radiusM: 1100, names: ["dick's sporting goods park", "dicks sporting goods park", "dsg park", "6000 victory"] },
    { name: "Folsom Field",               lat: 40.009497, lng: -105.266919, radiusM: 800,  names: ["folsom field"] },
    { name: "Red Rocks Amphitheatre",     lat: 39.665554, lng: -105.205250, radiusM: 1200, names: ["red rocks", "18300 w alameda", "18300 alameda"] },
    { name: "Fiddler's Green Amphitheatre", lat: 39.600493, lng: -104.893867, radiusM: 750, names: ["fiddler's green", "fiddlers green", "6350 greenwood plaza"] },
    { name: "Centennial Center Park Amphitheatre", lat: 39.596585, lng: -104.837442, radiusM: 500, names: ["centennial center park", "centennial amphitheater", "centennial amphitheatre", "13050 e peakview", "13050 peakview"] }
  ];

  /* The Denver metro — a union of centre + radius circles over the
     cities the owner named plus the suburbs that fill the gaps.
     Copied from the live RideWave table. */
  BBL_PRICING.metroZones = [
    { name: "Boulder",              lat: 40.0150, lng: -105.2705, radiusM: 9000 },
    { name: "Erie",                 lat: 40.0503, lng: -105.0499, radiusM: 7000 },
    { name: "Lafayette/Louisville", lat: 39.9857, lng: -105.1108, radiusM: 6500 },
    { name: "Broomfield",           lat: 39.9205, lng: -105.0867, radiusM: 7000 },
    { name: "I-25 corridor",        lat: 39.9650, lng: -104.9900, radiusM: 6000 },
    { name: "Westminster",          lat: 39.8367, lng: -105.0372, radiusM: 7500 },
    { name: "Commerce City",        lat: 39.8083, lng: -104.9337, radiusM: 6500 },
    { name: "Golden",               lat: 39.7555, lng: -105.2211, radiusM: 7000 },
    { name: "Lakewood",             lat: 39.7047, lng: -105.0814, radiusM: 8000 },
    { name: "Denver",               lat: 39.7392, lng: -104.9903, radiusM: 9500 },
    { name: "Aurora",               lat: 39.7294, lng: -104.8319, radiusM: 8000 },
    { name: "DEN airport",          lat: 39.8561, lng: -104.6737, radiusM: 8000 },
    { name: "Englewood",            lat: 39.6479, lng: -104.9876, radiusM: 6500 },
    { name: "Littleton",            lat: 39.6133, lng: -105.0166, radiusM: 7000 },
    { name: "Highlands Ranch",      lat: 39.5536, lng: -104.9692, radiusM: 6500 },
    { name: "Centennial",           lat: 39.5804, lng: -104.8768, radiusM: 8000 },
    /* BBL-ONLY ADDITIONS (owner order 2026-11-21, NOT in RideWave):
       the coverage fix for the by-request gate firing inside the
       metro. Sixteen named circles close the populated holes the
       2026-11-21 audit found (gatebug-work/REPORT.md +
       gatefix-work): all of 80007/80004, Morrison (the Red Rocks
       venue point deliberately stays OUTSIDE every circle — its
       margin is ~230 m — so venue pricing is untouched), Ken
       Caryl, Parker, the E-470 corridor both sides (Southlands,
       E-470 East, Green Valley Ranch, Reunion), Brighton,
       Lochbuie, Longmont (named by the owner — it prices now; it
       is no longer on the gate list), Gunbarrel/Niwot and Carbon
       Valley. Pueblo is NOT here — it is a flat zone below.
       Pueblo is a flat zone below; Grand Junction still gates. (Loveland city gated here until Build 20 — it is a $300 flat zone below now.) */
    { name: "Arvada West",        lat: 39.862, lng: -105.170, radiusM: 6800 },
    { name: "Arvada Southwest",   lat: 39.806, lng: -105.148, radiusM: 2800 },
    { name: "Morrison",           lat: 39.645, lng: -105.180, radiusM: 2900 },
    { name: "Morrison West",      lat: 39.652, lng: -105.208, radiusM: 1300 },
    { name: "Morrison North",     lat: 39.688, lng: -105.196, radiusM: 1800 },
    { name: "Ken Caryl",          lat: 39.583, lng: -105.115, radiusM: 5800 },
    { name: "Parker",             lat: 39.510, lng: -104.780, radiusM: 7200 },
    { name: "Southlands",         lat: 39.590, lng: -104.710, radiusM: 7800 },
    { name: "E-470 East",         lat: 39.742, lng: -104.692, radiusM: 7200 },
    { name: "Green Valley Ranch", lat: 39.800, lng: -104.715, radiusM: 5800 },
    { name: "Reunion",            lat: 39.898, lng: -104.778, radiusM: 6200 },
    { name: "Brighton",           lat: 39.985, lng: -104.812, radiusM: 6800 },
    { name: "Lochbuie",           lat: 40.004, lng: -104.724, radiusM: 6300 },
    { name: "Longmont",           lat: 40.168, lng: -105.108, radiusM: 8300 },
    { name: "Gunbarrel/Niwot",    lat: 40.082, lng: -105.180, radiusM: 5500 },
    { name: "Carbon Valley",      lat: 40.095, lng: -104.985, radiusM: 6200 }
  ];

  /* Mountain zones — one flat per town, copied from the live
     RideWave table. Aspen's own ski mountains and its airport ride
     at the Aspen price as satellite circles under the Aspen name;
     Eagle County Regional Airport (EGE) rides at the Eagle price.
     Name fallbacks carry RideWave's two traps: never the bare word
     "loveland" (it would match Loveland, the Front Range city) and
     never bare "eagle".
     BBL-ONLY ADDITION (owner order 2026-11-18 evening, NOT in
     RideWave — RideWave gates Colorado Springs as by-request):
     Colorado Springs rides at a flat $350 in this same table, so
     it pairs with the metro (and takes the higher flat against a
     mountain town) exactly like a mountain town, and the gate
     covers it. Its circle is city-sized (12 km — downtown, the
     Powers corridor and the airport) rather than resort-sized.
     The booking sheet labels it "Flat fare", not "Mountain fare"
     (see updatePrice in the page).
     BBL-ONLY ADDITION (owner order 2026-11-19, NOT in RideWave —
     RideWave gates Fort Collins as by-request): Fort Collins
     rides at a flat $250 in this same table (lowered from
     $300, owner order 2026-11-20), on the same terms
     as Colorado Springs — it pairs with the metro (and takes
     the higher flat against Colorado Springs or a mountain
     town), and the gate covers it. Its circle is city-sized
     (11 km). The sheet labels it "Flat fare" as well.
     BBL ADDITION (owner order 2026-11-20): Castle Rock rides
     at a flat $250 in this same table, on the same terms as
     Colorado Springs and Fort Collins — it pairs with the
     metro (and takes the higher flat against Colorado Springs,
     Fort Collins or a mountain town), and the gate covers it.
     Its circle is city-sized (12 km); Castle Pines, at the
     circle's northern edge, rides at the same $250. The sheet
     labels it "Flat fare" as well.
     BBL ADDITION (owner order 2026-11-20): Evergreen,
     including Evergreen Lake, rides at a flat $250 in this
     same table, on the same terms. Its circle is centred
     between downtown Evergreen and Evergreen Lake (both
     ~0.5 km from the centre) at an 8 km radius — deliberately
     NOT the city-sized 12 km of the other BBL towns: the Red
     Rocks Amphitheatre venue point sits 10.7 km from the
     centre, inside a 12 km circle, and capturing it would
     break the stadium rule for Red Rocks rides. At 8 km the
     venue centre and its whole 1.2 km venue circle stay
     outside this zone. The sheet labels it "Flat fare" too.
     BBL ADDITION (owner order 2026-11-21): Pueblo rides at a
     flat $450 in this same table, on the same terms as
     Colorado Springs — it pairs with the metro (and takes
     the higher flat against Colorado Springs, Fort Collins,
     Castle Rock, Evergreen or a mountain town), and the gate
     covers it. Two circles, on the Aspen satellite pattern:
     the city (11.5 km — downtown, the east side and the
     airport) and Pueblo West (9.5 km). The sheet labels it
     "Flat fare" as well. */
  BBL_PRICING.mountainZones = [
    { name: "Aspen",             lat: 39.1907, lng: -106.8192, radiusM: 2500, flat: 1200, names: ["aspen, co", "aspen, colorado"] },
    { name: "Aspen",             lat: 39.1826, lng: -106.8553, radiusM: 1000, flat: 1200, names: ["aspen highlands"] },
    { name: "Aspen",             lat: 39.2053, lng: -106.8608, radiusM: 1000, flat: 1200, names: ["buttermilk"] },
    { name: "Aspen",             lat: 39.2143, lng: -106.9458, radiusM: 2000, flat: 1200, names: ["snowmass"] },
    { name: "Aspen",             lat: 39.2232, lng: -106.8688, radiusM: 1000, flat: 1200, names: ["aspen airport", "pitkin county airport", "aspen/pitkin"] },
    { name: "Glenwood Springs",  lat: 39.5500, lng: -107.3248, radiusM: 2000, flat: 950,  names: ["glenwood springs"] },
    { name: "Loveland Ski Area", lat: 39.6814, lng: -105.9145, radiusM: 2000, flat: 450,  names: ["loveland ski", "loveland basin", "loveland valley", "loveland pass"] },
    { name: "Winter Park",       lat: 39.8869, lng: -105.7625, radiusM: 4000, flat: 500,  names: ["winter park"] },
    { name: "Keystone",          lat: 39.6003, lng: -105.9831, radiusM: 2500, flat: 600,  names: ["keystone, co", "keystone resort", "river run"] },
    { name: "Copper Mountain",   lat: 39.5008, lng: -106.1465, radiusM: 2000, flat: 700,  names: ["copper mountain"] },
    { name: "Breckenridge",      lat: 39.4821, lng: -106.0487, radiusM: 2000, flat: 700,  names: ["breckenridge"] },
    { name: "Vail",              lat: 39.6403, lng: -106.3709, radiusM: 2500, flat: 800,  names: ["vail, co", "vail village", "lionshead"] },
    { name: "Eagle",             lat: 39.6553, lng: -106.8287, radiusM: 2500, flat: 800,  names: ["eagle, co", "eagle, colorado"] },
    { name: "Eagle",             lat: 39.6426, lng: -106.9177, radiusM: 1500, flat: 800,  names: ["eagle county regional", "eagle county airport"] },
    { name: "Colorado Springs",  lat: 38.8339, lng: -104.8214, radiusM: 12000, flat: 350, names: ["colorado springs"] },
    { name: "Fort Collins",     lat: 40.5853, lng: -105.0844, radiusM: 11000, flat: 250, names: ["fort collins"] },
    { name: "Castle Rock",      lat: 39.3722, lng: -104.8561, radiusM: 12000, flat: 250, names: ["castle rock"] },
    { name: "Evergreen",        lat: 39.6317, lng: -105.3221, radiusM: 8000,  flat: 250, names: ["evergreen, co", "evergreen, colorado", "evergreen lake"] },
    { name: "Pueblo",           lat: 38.272, lng: -104.600, radiusM: 11500, flat: 450, names: ["pueblo"] },
    { name: "Pueblo",           lat: 38.330, lng: -104.720, radiusM: 9500,  flat: 450, names: ["pueblo west"] },
    /* Build 20 mirror (owner orders 2026-11-22): the new RideWave
       flats, same centres/radii as the RideWave ship — Estes Park,
       Georgetown, Downieville, Idaho Springs, Empire and Silver
       Plume at $350; Frisco, Silverthorne and Dillon at $500;
       Lyons at $300; Nederland at $250; and Loveland CITY at $300
       as a city flat in this same table (the ski area above is a
       separate zone at $450 — the name fallbacks keep the two
       apart: the city matches "loveland, co", never bare
       "loveland", and the ski area matches "loveland ski" etc.). */
    { name: "Estes Park",       lat: 40.3772, lng: -105.5232, radiusM: 3000, flat: 350, names: ["estes park"] },
    { name: "Georgetown",       lat: 39.7062, lng: -105.6971, radiusM: 2000, flat: 350, names: ["georgetown, co", "georgetown, colorado"] },
    { name: "Downieville",      lat: 39.7662, lng: -105.6138, radiusM: 1200, flat: 350, names: ["downieville"] },
    { name: "Idaho Springs",    lat: 39.7426, lng: -105.5136, radiusM: 2500, flat: 350, names: ["idaho springs"] },
    { name: "Empire",           lat: 39.7611, lng: -105.6830, radiusM: 1500, flat: 350, names: ["empire, co", "empire, colorado"] },
    { name: "Silver Plume",     lat: 39.6961, lng: -105.7258, radiusM: 1200, flat: 350, names: ["silver plume"] },
    { name: "Frisco",           lat: 39.5755, lng: -106.0952, radiusM: 2500, flat: 500, names: ["frisco, co", "frisco, colorado"] },
    { name: "Silverthorne",     lat: 39.6383, lng: -106.0747, radiusM: 2500, flat: 500, names: ["silverthorne"] },
    { name: "Dillon",           lat: 39.6303, lng: -106.0433, radiusM: 2500, flat: 500, names: ["dillon, co", "dillon, colorado"] },
    { name: "Lyons",            lat: 40.2244, lng: -105.2705, radiusM: 2500, flat: 300, names: ["lyons, co", "lyons, colorado"] },
    { name: "Nederland",        lat: 39.9614, lng: -105.5108, radiusM: 2000, flat: 250, names: ["nederland, co", "nederland, colorado"] },
    { name: "Loveland",         lat: 40.3978, lng: -105.0750, radiusM: 9500, flat: 300, names: ["loveland, co", "loveland, colorado"] }
  ];

  /* The meter formula, copied from the shipped computedFare():
       fare = base + miles * ratePerMile
            + airportSurcharge            (if either end is an airport)
            + (miles - 50) * longHaulPerMile   (only past 50 miles)
     rounded to cents. Kept in this boolean form as the meter core
     (the build harness parity-checks it against the shipped page);
     meterFare() below is the same math with the Denver-metro
     airport test (airportSurchargeFor) deciding the surcharge. */
  BBL_PRICING.computeFare = function (miles, hasAirport) {
    var rt = BBL_PRICING.rates[BBL_PRICING.tier];
    var fare = rt.base + miles * rt.ratePerMile;
    if (hasAirport) fare += BBL_PRICING.airportSurcharge[BBL_PRICING.tier] || 0;
    if (miles > BBL_PRICING.longHaulAfterMiles) {
      fare += (miles - BBL_PRICING.longHaulAfterMiles) * (BBL_PRICING.longHaulPerMile[BBL_PRICING.tier] || 0);
    }
    return Math.round(fare * 100) / 100;
  };

  /* Denver-metro airport detection (owner order 2026-11-19,
     supersedes RideWave's DIA-only _diaSurcharge test in this
     snapshot): an endpoint is a metro airport when its
     coordinates fall within the airport's radiusM, or its
     address names that airport specifically (the table's name /
     code keywords). Returns the airport entry or null. */
  var DIA_SHORT_TOKENS = /\b(?:dia|den)\b/i;
  BBL_PRICING.metroAirportOf = function (lat, lng, addr) {
    var p = validLatLng(lat, lng), i, j;
    if (p) {
      for (i = 0; i < BBL_PRICING.metroAirports.length; i++) {
        var a = BBL_PRICING.metroAirports[i];
        if (distM(p[0], p[1], a.lat, a.lng) <= a.radiusM) return a;
      }
    }
    var s = (addr || "").toString().toLowerCase();
    if (s) {
      for (i = 0; i < BBL_PRICING.metroAirports.length; i++) {
        var names = BBL_PRICING.metroAirports[i].names;
        for (j = 0; j < names.length; j++) {
          if (s.indexOf(names[j]) >= 0) return BBL_PRICING.metroAirports[i];
        }
      }
      if (DIA_SHORT_TOKENS.test(addr || "")) return BBL_PRICING.metroAirports[0];
    }
    return null;
  };

  /* The airport surcharge for one ride: the tier amount, charged
     ONCE, when either endpoint is a Denver-metro airport (by
     coordinates from the optional ride-data argument, or by
     address). Non-metro airports and bare city names return 0. */
  BBL_PRICING.airportSurchargeFor = function (pickupAddr, dropoffAddr, data) {
    var amt = BBL_PRICING.airportSurcharge[BBL_PRICING.tier];
    if (!amt) return 0;
    var d = data || {};
    if (BBL_PRICING.metroAirportOf(d.pickupLat, d.pickupLng, pickupAddr)) return amt;
    if (BBL_PRICING.metroAirportOf(d.dropoffLat, d.dropoffLng, dropoffAddr)) return amt;
    return 0;
  };

  /* Legacy name kept for parity with the snapshot's sources —
     now the metro-airport test above, not DIA-only. */
  BBL_PRICING.diaSurchargeFor = function (pickupAddr, dropoffAddr, data) {
    return BBL_PRICING.airportSurchargeFor(pickupAddr, dropoffAddr, data);
  };

  /* The wider "is this address DIA at all" test (backend
     _isDIAAddress) — used only as the no-coordinates fallback for
     the metro test, never for money. */
  BBL_PRICING.isDIAAddress = function (addr) {
    var s = (addr || "").toString().toLowerCase();
    if (!s) return false;
    for (var i = 0; i < BBL_PRICING.diaKeywords.length; i++) {
      if (s.indexOf(BBL_PRICING.diaKeywords[i]) >= 0) return true;
    }
    if (/terminal\s+(?:east|west|north|south|[ewns])\b/.test(s)) return true;
    if (s.indexOf("jeppesen") >= 0) return true;
    if (s.indexOf("80249") >= 0 && (s.indexOf("terminal") >= 0 || s.indexOf("airport") >= 0)) return true;
    return DIA_SHORT_TOKENS.test(addr || "");
  };

  /* The canonical meter fare (backend _canonicalFare): base +
     miles x per-mile + airport surcharge (any Denver-metro
     airport endpoint, once) + long-distance surcharge, never
     below base, rounded to cents. The optional ride-data
     argument carries the endpoint coordinates for the airport
     test; without it the test runs on the addresses alone. */
  BBL_PRICING.meterFare = function (miles, pickupAddr, dropoffAddr, data) {
    var rt = BBL_PRICING.rates[BBL_PRICING.tier];
    var m = Number(miles) || 0;
    var raw = rt.base + m * rt.ratePerMile
      + BBL_PRICING.airportSurchargeFor(pickupAddr, dropoffAddr, data);
    if (m > BBL_PRICING.longHaulAfterMiles) {
      raw += (m - BBL_PRICING.longHaulAfterMiles) * (BBL_PRICING.longHaulPerMile[BBL_PRICING.tier] || 0);
    }
    return Math.round(Math.max(rt.base, raw) * 100) / 100;
  };

  /* ---- zone geometry (the codebase's own distance shape) ---- */
  function distM(la1, ln1, la2, ln2) {
    var dLat = (la1 - la2) * 111320;
    var dLng = (ln1 - ln2) * 111320 * Math.cos(la2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }
  function validLatLng(lat, lng) {
    var la = parseFloat(lat), ln = parseFloat(lng);
    return (isFinite(la) && isFinite(ln) && (la !== 0 || ln !== 0)) ? [la, ln] : null;
  }
  function zoneOf(zones, lat, lng, addr) {
    var p = validLatLng(lat, lng), i, j;
    if (p) {
      for (i = 0; i < zones.length; i++) {
        if (distM(p[0], p[1], zones[i].lat, zones[i].lng) <= zones[i].radiusM) return zones[i];
      }
    }
    var s = (addr || "").toString().toLowerCase();
    if (s) {
      for (i = 0; i < zones.length; i++) {
        for (j = 0; j < zones[i].names.length; j++) {
          if (s.indexOf(zones[i].names[j]) >= 0) return zones[i];
        }
      }
    }
    return null;
  }
  BBL_PRICING.distM = distM;
  BBL_PRICING.stadiumZoneOf = function (lat, lng, addr) { return zoneOf(BBL_PRICING.stadiumZones, lat, lng, addr); };
  BBL_PRICING.mountainZoneOf = function (lat, lng, addr) { return zoneOf(BBL_PRICING.mountainZones, lat, lng, addr); };

  /* Is one endpoint inside the metro area? Coordinates decide when
     they exist; with none, only the airport can be proved metro —
     anything else unproven counts as outside, so the mileage fare
     is honoured with the $200 minimum rather than capped flat. */
  BBL_PRICING.endpointInMetro = function (lat, lng, addr) {
    var p = validLatLng(lat, lng);
    if (p) {
      for (var i = 0; i < BBL_PRICING.metroZones.length; i++) {
        var z = BBL_PRICING.metroZones[i];
        if (distM(p[0], p[1], z.lat, z.lng) <= z.radiusM) return true;
      }
      return false;
    }
    return BBL_PRICING.isDIAAddress(addr);
  };

  /* The stadium rule for a ride-shaped object ({pickup, dropoff,
     pickupLat, pickupLng, dropoffLat, dropoffLng}), or null when
     neither endpoint is a stadium zone. */
  BBL_PRICING.stadiumRuleFor = function (data) {
    var puZ = BBL_PRICING.stadiumZoneOf(data.pickupLat, data.pickupLng, data.pickup);
    var doZ = BBL_PRICING.stadiumZoneOf(data.dropoffLat, data.dropoffLng, data.dropoff);
    var z = puZ || doZ;
    if (!z) return null;
    var otherInMetro;
    if (puZ && doZ) otherInMetro = true;
    else if (puZ) otherInMetro = BBL_PRICING.endpointInMetro(data.dropoffLat, data.dropoffLng, data.dropoff);
    else otherInMetro = BBL_PRICING.endpointInMetro(data.pickupLat, data.pickupLng, data.pickup);
    return { name: z.name, flat: otherInMetro };
  };

  /* The mountain rule for a ride-shaped object, or null when the
     flat does not govern: no mountain endpoint, or a mountain
     endpoint whose other end is neither metro nor mountain (that
     pair is not auto-priced — the gate below refuses it). */
  BBL_PRICING.mountainRuleFor = function (data) {
    var puZ = BBL_PRICING.mountainZoneOf(data.pickupLat, data.pickupLng, data.pickup);
    var doZ = BBL_PRICING.mountainZoneOf(data.dropoffLat, data.dropoffLng, data.dropoff);
    if (!puZ && !doZ) return null;
    if (puZ && doZ) {
      var hi = puZ.flat >= doZ.flat ? puZ : doZ;
      return { name: hi.name, flat: hi.flat, amount: hi.flat };
    }
    var z = puZ || doZ;
    var otherInMetro = puZ
      ? BBL_PRICING.endpointInMetro(data.dropoffLat, data.dropoffLng, data.dropoff)
      : BBL_PRICING.endpointInMetro(data.pickupLat, data.pickupLng, data.pickup);
    if (!otherInMetro) return null;
    return { name: z.name, flat: z.flat, amount: z.flat };
  };

  /* Closed list: an endpoint is covered if it is inside the metro
     union, a mountain zone or a stadium zone. */
  BBL_PRICING.endpointCovered = function (lat, lng, addr) {
    if (BBL_PRICING.mountainZoneOf(lat, lng, addr)) return true;
    if (BBL_PRICING.stadiumZoneOf(lat, lng, addr)) return true;
    return BBL_PRICING.endpointInMetro(lat, lng, addr);
  };
  /* Mirrors the shipped backend gate exactly (_openCountryFor +
     _endpointCovered in functions/index.js, enforced at checkout by
     _requireServerFare with ADMIN_REQUEST_ONLY, and mirrored on the
     rider's confirm screen): a ride is open country when EITHER
     endpoint is covered by nothing — outside the metro union and
     not itself in a stadium or mountain zone. There is no zone
     suppression: Longmont -> Coors Field is refused online even
     though the fare oracle prices it (stadium $200 minimum), because
     Longmont is covered by nothing. The oracle fare still stands on
     the result for admin parity; the customer calls or texts. */
  BBL_PRICING.openCountryFor = function (data) {
    return !BBL_PRICING.endpointCovered(data.pickupLat, data.pickupLng, data.pickup)
        || !BBL_PRICING.endpointCovered(data.dropoffLat, data.dropoffLng, data.dropoff);
  };

  /* The full RideWave rate stack for one ride. Returns
     { fare, meterFare, stadium, mountain, openCountry } — fare is
     null when the admin-request gate applies (no instant price). */
  BBL_PRICING.priceRide = function (miles, data) {
    var meter = BBL_PRICING.meterFare(miles, data.pickup, data.dropoff, data);
    var mtn = BBL_PRICING.mountainRuleFor(data);
    var stad = mtn ? null : BBL_PRICING.stadiumRuleFor(data);
    var fare = meter;
    if (mtn) fare = mtn.amount;
    else if (stad) fare = stad.flat ? BBL_PRICING.stadiumFare : Math.max(fare, BBL_PRICING.stadiumFare);
    var open = BBL_PRICING.adminRequestGate ? BBL_PRICING.openCountryFor(data) : false;
    return { fare: open ? null : fare, meterFare: meter, stadium: stad, mountain: mtn, openCountry: open };
  };

  /* Hourly eligibility (owner order 2026-11-20): may this ride
     price by the hour at all? Only a covered metro pair with no
     flat-fare zone and no stadium zone may. A flat-fare zone
     (mountainRuleFor) wins first — its flat fare governs the
     ride in every mode; then the gate: an endpoint covered by
     nothing (openCountryFor, the gate's own test) means no
     instant price in any mode; then the venue rule
     (stadiumRuleFor): a stadium endpoint's ride prices by rule
     3 — flat $200 with a metro other end, meter with the $200
     minimum without one — never by the hour. The gate precedes
     venue on purpose: stadiumRuleFor alone does not null a
     venue endpoint paired with an uncovered end (Longmont ->
     Coors Field), but priceRide still refuses that pair, so the
     gate governs it in every mode — the same treatment a flat
     endpoint + uncovered end gets (Vail -> Grand Junction).
     Returns { allowed, reason: "flat" | "gate" | "venue" | null,
     mountain, stadium, openCountry } for the ride-shaped data
     object. */
  BBL_PRICING.hourlyEligibility = function (data) {
    var mtn = BBL_PRICING.mountainRuleFor(data);
    if (mtn) return { allowed: false, reason: "flat", mountain: mtn, stadium: null, openCountry: false };
    var open = BBL_PRICING.adminRequestGate ? BBL_PRICING.openCountryFor(data) : false;
    if (open) return { allowed: false, reason: "gate", mountain: null, stadium: null, openCountry: true };
    var stad = BBL_PRICING.stadiumRuleFor(data);
    if (stad) return { allowed: false, reason: "venue", mountain: null, stadium: stad, openCountry: false };
    return { allowed: true, reason: null, mountain: null, stadium: null, openCountry: false };
  };

  /* Hourly — the rider page's own formula: first hour, then the
     hourly rate for each additional hour. */
  BBL_PRICING.hourlyFare = function (hours) {
    var h = Math.max(1, Number(hours) || 0);
    return BBL_PRICING.hourlyFirstHour + BBL_PRICING.hourlyRate * (h - 1);
  };

  BBL_PRICING.meta = {
    business: "Boulder Black Line",
    snapshotDate: "2026-11-18",
    sourceFiles: ["functions/index.js (ridewave-functions)", "app.html (ridewave-web)"],
    sourceBlobs: ["17e751439ffe81247b63635c84cc2c7b48e2763c", "48f41448e533c1a719bdd4a62b1297ba844ecb22"],
    note: "Snapshot only — no live link to RideWave pricing in either direction. Rates made identical to RideWave's live fare stack at the owner's order, 2026-11-18. BBL-only change 2026-11-19 (staged, not deployed): the airport surcharge now covers every Denver-metro airport, not DIA only. BBL addition 2026-11-20 (staged on preview, not deployed): Castle Rock and Evergreen (incl. Evergreen Lake) join the flat table at $250 each. BBL rule 2026-11-20 (staged on preview, not deployed): hourly prices only for a covered metro pair with no flat-fare zone governing — flat-fare towns are flat-only and uncovered pairs stay gated in every mode (hourlyEligibility). BBL rule extension 2026-11-20 (owner order, staged on preview, not deployed): stadium / venue endpoints are hourly-blocked too — the venue fare governs those rides in every mode (hourlyEligibility reason venue). BBL coverage fix 2026-11-21 (owner order, staged on preview, not deployed): sixteen BBL-only metro circles close the populated gate holes (Arvada West + Southwest, Morrison x3, Ken Caryl, Parker, Southlands, E-470 East, Green Valley Ranch, Reunion, Brighton, Lochbuie, Longmont, Gunbarrel/Niwot, Carbon Valley) and Pueblo joins the flat table at $450 (two circles: city + Pueblo West). Longmont prices now — the owner named it covered; Grand Junction still gates. Build 20 mirror 2026-11-22 (owner orders): Estes Park, Georgetown, Downieville, Idaho Springs, Empire, Silver Plume flat $350; Frisco, Silverthorne, Dillon flat $500; Lyons flat $300; Nederland flat $250; Loveland city flat $300 (city zone, distinct from the ski area); Loveland Ski Area $400 -> $450 — same centres/radii as the RideWave ships of 2026-11-22."
  };

  /* Version stamp — the quote page pins its script URL to this
     stamp (bbl-pricing.js?v=<stamp>) and verifies it at boot.
     The page is served always-fresh while this file is served
     cache-first by the host's service worker, so an unstamped
     pairing once wedged pricing on the owner's phone (2026-11-18:
     the Nov 17 snapshot, which has no priceRide/mountainRuleFor,
     served against the current page forever). ANY edit to this
     file MUST bump the stamp here AND the page's
     PRICING_STAMP_EXPECTED + script-tag query together. */
  BBL_PRICING.stamp = "2026-11-22-build20";
  window.BBL_PRICING = BBL_PRICING;
})();
