// Demo / development receipts (synthetic). These are the receipts the rules were tuned on.
// The held-out set used for measuring lives in data/heldout.json and was written first.
(function (root) {
  var CLIENTS = ["Maple & Moss", "Orbit Kitchen", "Tidewater Press"];
  var R = [
    ["D01","Bytebase Cloud","2026-01-03",19.00,"BYTEBASE CLOUD\nDatabase hosting starter\nMonthly\nTOTAL 19.00",""],
    ["D02","Tram & Go","2026-01-05",4.20,"TRAM & GO\nSingle fare zone 1-2\nTOTAL 4.20","to Orbit Kitchen meeting"],
    ["D03","Little Fig Bakery","2026-01-05",6.80,"LITTLE FIG BAKERY\nCappuccino\nAlmond croissant\nTOTAL 6.80",""],
    ["D04","Inkwell Office Supply","2026-01-08",22.40,"INKWELL OFFICE SUPPLY\nPrinter ink black\nStaples box\nTOTAL 22.40",""],
    ["D05","Circuit Corner","2026-01-10",149.00,"CIRCUIT CORNER\nWebcam HD 1080p\nTOTAL 149.00",""],
    ["D06","Wavelink Telecom","2026-01-14",32.00,"WAVELINK TELECOM\nMobile plan - January\nData 30GB\nAMOUNT DUE 32.00",""],
    ["D07","Hive Desk Space","2026-01-01",160.00,"HIVE DESK SPACE\nFlex desk membership Jan\nTOTAL 160.00",""],
    ["D08","Brightline Legal","2026-01-18",300.00,"BRIGHTLINE LEGAL\nContract review - service agreement\nFee 300.00",""],
    ["D09","Little Fig Bakery","2026-01-19",27.50,"LITTLE FIG BAKERY\n3x lunch box\n3x lemonade\nTOTAL 27.50","lunch with Maple & Moss, project kickoff"],
    ["D10","Zoomride Taxi","2026-01-19",12.10,"ZOOMRIDE TAXI\nTrip 5.1 km\nFARE 12.10","to Maple & Moss studio"],
    ["D11","Zoomride Taxi","2026-01-19",12.10,"ZOOMRIDE TAXI\nTrip 5.1 km\nFARE 12.10",""],
    ["D12","Glyphhouse Fonts","2026-01-22",45.00,"GLYPHHOUSE FONTS\nWeb font license\nTOTAL 45.00","for Tidewater Press magazine layout"],
    ["D13","Everything Depot","2026-01-24",48.75,"EVERYTHING DEPOT\nHDMI adapter\nNotebook\nShampoo\nCandy\nTOTAL 48.75",""],
    ["D14","","2026-01-26",5.50,"*** RCPT ***\nT0TAL 5.5O\nthx",""],
    ["D15","Flixhub","2026-02-01",10.99,"FLIXHUB\nStandard monthly\nTOTAL 10.99",""],
    ["D16","Stockframe Photos","2026-02-02",35.00,"STOCKFRAME PHOTOS\n10 image credits\nTOTAL 35.00","Orbit Kitchen menu redesign"],
    ["D17","Seaview Inn","2026-02-06",118.00,"SEAVIEW INN\n1 night double room\nTOTAL 118.00","Tidewater Press print check trip"],
    ["D18","Wavelink Telecom","2026-02-14",32.00,"WAVELINK TELECOM\nMobile plan - February\nData 30GB\nAMOUNT DUE 32.00",""],
    ["D19","Hive Desk Space","2026-02-01",160.00,"HIVE DESK SPACE\nFlex desk membership Feb\nTOTAL 160.00",""],
    ["D20","Inkwell Office Supply","2026-02-16",31.00,"INKWELL OFFICE SUPPLY\nSample prints A3 x6\nTOTAL 31.00","proofs for Tidewater Press"],
    ["D21","SkyArc Air","2026-02-20",189.00,"SKYARC AIR\nE-ticket economy return\nTOTAL 189.00",""],
    ["D22","Bytebase Cloud","2026-02-03",19.00,"BYTEBASE CLOUD\nDatabase hosting starter\nMonthly\nTOTAL 19.00",""],
    ["D23","Petal Post Florist","2026-03-07",35.00,"PETAL POST FLORIST\nBouquet small\nTOTAL 35.00",""],
    ["D24","Circuit Corner","2026-03-12",-149.00,"CIRCUIT CORNER\nWebcam HD 1080p\nREFUND\nTOTAL -149.00",""],
    ["D25","Fuelpoint","2026-03-14",44.00,"FUELPOINT\nDiesel 26.0 L\nTOTAL 44.00",""],
    ["D26","Wordsmith Copy Co","2026-03-18",90.00,"WORDSMITH COPY CO\nProofreading 3,000 words\nTOTAL 90.00","Tidewater Press issue 4"],
    ["D27","Tram & Go","2026-03-20",4.20,"TRAM & GO\nSingle fare zone 1-2\nTOTAL 4.20",""],
    ["D28","Little Fig Bakery","2026-03-24",30.20,"LITTLE FIG BAKERY\n4x dinner pie\nTOTAL 30.20","Orbit Kitchen launch dinner"]
  ];
  var receipts = R.map(function (a) { return { id: a[0], merchant: a[1], date: a[2], total: a[3], text: a[4], note: a[5] }; });
  var api = { CLIENTS: CLIENTS, DEMO_RECEIPTS: receipts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.CLIENTS = CLIENTS; root.DEMO_RECEIPTS = receipts; }
})(this);
