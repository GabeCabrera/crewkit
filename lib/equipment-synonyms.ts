/**
 * Equipment Search Synonyms - Organized by Category
 * 
 * Maps common alternative search terms to keywords that appear in equipment names/SKUs.
 * This allows users to find equipment using familiar terms even if they don't know the exact name.
 * 
 * Categories:
 * - AERIAL: Strand, lashing, pole hardware, guy wire, clamps
 * - UNDERGROUND: Conduit, handholes, vaults, pedestals, tracer wire
 * - INSTALLING: ONT/ONU, NIDs, drop cables, fiber boxes, wall plates, mounting hardware
 * - SPLICING: Closures, trays, pigtails, splitters, connectors
 * - OTHER: Tools, networking equipment, power, radios, general supplies
 */

// =============================================================================
// AERIAL EQUIPMENT SYNONYMS
// =============================================================================
export const aerialSynonyms: Record<string, string[]> = {
  // Strand and Lashing
  "strand": ["ehs", "guy wire", "messenger", "1/4"],
  "messenger": ["strand", "ehs", "messenger wire"],
  "lashing": ["wire", "lashing wire", "strand"],
  "lashing wire": ["lashing", "wire", ".045"],
  
  // Guy Hardware
  "guy wire": ["strand", "ehs", "anchor", "down guy"],
  "guy": ["strand", "anchor", "deadend", "thimble"],
  "anchor": ["guy", "screw anchor", "rod", "helix"],
  "deadend": ["guy", "grip", "strandvise", "dead end", "dead-end"],
  "strandvise": ["deadend", "automatic", "dead end"],
  
  // Bolts - with size variations (keep synonyms specific to avoid over-matching)
  "bolt": ["machine bolt", "thimble eye", "lag bolt", "eye bolt"],
  "machine bolt": ["bolt, machine", "bolt machine"],
  "thimble bolt": ["bolt, thimble", "thimble eye"],
  "eye bolt": ["thimble eye", "bolt, thimble"],
  "lag bolt": ["lag screw", "lag bolts"],
  "12 inch bolt": ["x 12\"", "x 12", "12\" bolt"],
  "12\" bolt": ["x 12\"", "x 12", "12 inch bolt"],
  "12in bolt": ["x 12\"", "x 12", "12 inch bolt"],
  "14 inch bolt": ["x 14\"", "x 14", "14\" bolt"],
  "14\" bolt": ["x 14\"", "x 14", "14 inch bolt"],
  "14in bolt": ["x 14\"", "x 14", "14 inch bolt"],
  "16 inch bolt": ["x 16\"", "x 16", "16\" bolt"],
  "16\" bolt": ["x 16\"", "x 16", "16 inch bolt"],
  "16in bolt": ["x 16\"", "x 16", "16 inch bolt"],
  
  // Nuts and Washers (keep specific to avoid over-matching)
  "nut": ["square nut", "thimble eye nut"],
  "square nut": ["nut, square", "nut square"],
  "washer": ["washer, square", "washer square", "square washer"],
  
  // Clamps
  "clamp": ["b clamp", "d clamp", "k1", "suspension", "lashing", "cable"],
  "b clamp": ["suspension", "clamp", "3 hole"],
  "suspension clamp": ["b clamp", "clamp", "cable"],
  "d clamp": ["lashing", "clamp", "bug nut"],
  "lashing clamp": ["d clamp", "clamp"],
  "k1 clamp": ["bonding", "clamp", "ground"],
  "bonding clamp": ["k1", "ground", "clamp"],
  
  // Hooks
  "hook": ["guy hook", "b hook", "drive hook", "p hook", "rams head"],
  "guy hook": ["b hook", "rams head", "hook"],
  "b hook": ["guy hook", "rams head", "1-hole"],
  "drive hook": ["j hook", "j type", "7/16"],
  "p hook": ["drop wire", "hook", "3-3/4"],
  "drop wire hook": ["p hook", "hook"],
  
  // Straps and Spacers
  "strap": ["lashing", "support", "10\"", "16\"", "stainless"],
  "support strap": ["strap", "lashing", "cable"],
  "spacer": ["lashing", "1/2", "stackable"],
  "cable spacer": ["spacer", "1/2", "stackable"],
  
  // Pole Hardware
  "standoff": ["bracket", "diamond", "v-style", "pole mount"],
  "pole mount": ["standoff", "bracket", "diamond"],
  "diamond bracket": ["standoff", "pole mount", "12\""],
  
  // Grips
  "grip": ["deadend", "guy", "preformed", "splice"],
  "preformed grip": ["grip", "deadend", "splice"],
  "strand splice": ["grip", "preformed", "1/4"],
  
  // Insulators and Guards
  "insulator": ["guy", "3 1/2"],
  "guy guard": ["guard", "yellow", "96\""],
  
  // Drop Wire
  "drop wire clamp": ["drop", "clamp", "2 pair", "dimpled"],
  "drop clamp": ["drop wire", "clamp"],
};

// =============================================================================
// UNDERGROUND EQUIPMENT SYNONYMS
// =============================================================================
export const undergroundSynonyms: Record<string, string[]> = {
  // Conduit
  "conduit": ["emt", "pvc", "pipe", "rigid", "flex"],
  "pipe": ["conduit", "pvc", "emt", "rigid"],
  "emt": ["conduit", "electrical metallic", "pipe"],
  "pvc": ["conduit", "pipe", "schedule 40"],
  "rigid": ["conduit", "metal", "2 in"],
  "flex": ["conduit", "flexible", "3/4"],
  
  // Conduit sizes
  "1/2 conduit": ["1/2\"", "conduit", "half inch"],
  "3/4 conduit": ["3/4\"", "conduit", "three quarter"],
  "1 conduit": ["1\"", "conduit", "one inch"],
  "1.25 conduit": ["1 1/4", "1.25", "conduit"],
  "1 1/4 conduit": ["1.25", "conduit", "1-1/4"],
  "1.5 conduit": ["1 1/2", "1.5", "conduit"],
  "1 1/2 conduit": ["1.5", "conduit", "1-1/2"],
  "2 conduit": ["2\"", "conduit", "two inch"],
  "3 conduit": ["3\"", "conduit", "three inch"],
  
  // Conduit fittings
  "coupler": ["coupling", "connector", "conduit"],
  "coupling": ["coupler", "connector"],
  "conduit coupler": ["coupler", "coupling", "connector"],
  "plug": ["conduit", "2\"", "cap"],
  "elbow": ["90", "bend", "pvc", "conduit"],
  "90 elbow": ["elbow", "bend", "90 degree"],
  
  // Handholes and Vaults
  "handhole": ["vault", "box", "polymer", "concrete", "plastic"],
  "vault": ["handhole", "box", "concrete", "polymer"],
  "polymer handhole": ["handhole", "plastic", "vault"],
  "concrete handhole": ["handhole", "vault", "polymer concrete"],
  "plastic handhole": ["handhole", "14x19", "plastic"],
  
  // Pedestals
  "pedestal": ["ped", "cabinet", "enclosure"],
  "ped": ["pedestal", "cabinet"],
  
  // Tracer Wire
  "tracer": ["tracer wire", "locate", "wire"],
  "tracer wire": ["tracer", "locate", "2500"],
  "locate wire": ["tracer", "tracer wire"],
  
  // Pull Tape
  "pull tape": ["tape", "1800", "pulling"],
  "pulling tape": ["pull tape", "rope"],
  
  // Poly Line
  "poly line": ["pull", "rope", "line"],
  "pull line": ["poly", "rope"],
};

// =============================================================================
// INSTALLING EQUIPMENT SYNONYMS
// =============================================================================
export const installingSynonyms: Record<string, string[]> = {
  // ONT/ONU
  "ont": ["onu", "optical network", "calix", "gp1100", "gp4200", "gigaspire"],
  "onu": ["ont", "optical network", "ufiber", "wave", "ubiquiti"],
  "optical network terminal": ["ont", "onu"],
  "calix": ["ont", "gp1100", "gp4200", "gigaspire", "e7"],
  "gp1100": ["calix", "ont", "indoor"],
  "gp4200": ["calix", "ont", "outdoor"],
  "gigaspire": ["calix", "router", "u4", "u6", "gs"],
  "ufiber": ["ubiquiti", "onu", "wave", "loco"],
  
  // NIDs
  "nid": ["fiber box", "network interface", "demarcation"],
  "fiber box": ["nid", "lynn", "thefiberbox", "demarcation"],
  "demarcation": ["nid", "fiber box", "demarc"],
  "demarc": ["demarcation", "nid"],
  
  // Drop Cables
  "drop": ["drop cable", "fiber", "flat", "armored"],
  "drop cable": ["drop", "fiber", "flat", "preterminated", "preterm"],
  "flat drop": ["drop", "2 ct", "flat"],
  "preterm drop": ["drop", "preterminated", "pre term", "50", "100"],
  "preterminated": ["preterm", "pre term", "drop"],
  
  // Drop cable lengths
  "50 ft drop": ["50", "drop", "50'"],
  "100 ft drop": ["100", "drop", "100'"],
  "150 ft drop": ["150", "drop", "150'"],
  "200 ft drop": ["200", "drop", "200'"],
  "300 ft drop": ["300", "drop", "300'"],
  "500 ft drop": ["500", "drop", "500'"],
  
  // Bullet/MST/HST
  "bullet": ["simplex", "fiber", "armored", "outdoor"],
  "simplex bullet": ["bullet", "fiber", "armored"],
  "mst": ["multi", "strand", "terminal", "port"],
  "hst": ["hardened", "strand", "terminal", "port"],
  
  // Wall Plates
  "wall plate": ["faceplate", "port", "rj45", "keystone", "gang"],
  "faceplate": ["wall plate", "cover", "port"],
  "1 port": ["wall plate", "single", "1 gang"],
  "2 port": ["wall plate", "double", "2 gang"],
  "3 port": ["wall plate", "triple", "3 gang"],
  "4 port": ["wall plate", "quad", "4 gang"],
  "6 port": ["wall plate", "six", "6 gang"],
  "keystone": ["jack", "wall plate", "rj45", "cat5", "cat6"],
  "keystone jack": ["keystone", "cat5", "cat6", "rj45"],
  
  // RJ45
  "rj45": ["ethernet", "cat5", "cat6", "connector", "keystone", "patch"],
  "ethernet jack": ["rj45", "keystone", "cat5", "cat6"],
  
  // Surface Mount
  "surface mount": ["surface", "box", "jack", "1 port"],
  "surface jack": ["surface mount", "box", "wall"],
  
  // Mounting
  "mount": ["bracket", "wall mount", "pole mount", "j pipe", "tripod"],
  "wall mount": ["mount", "bracket", "calix", "onu"],
  "j pipe": ["mount", "22", "39", "antenna"],
  "tripod": ["mount", "antenna", "3 ft"],
  "quickmount": ["mikrotik", "mount", "quick mount"],
  
  // Gel Seal
  "gel seal": ["drop", "adapter", "seal"],
  "drop adapter": ["gel seal", "seal"],
  
  // Anchors and Screws
  "lag": ["bolt", "screw", "wood", "anchor"],
  "lag bolt": ["lag", "screw", "wood"],
  "wood screw": ["screw", "wood", "lag"],
  "anchor": ["wall anchor", "lag", "1/4", ".25"],
  "wall anchor": ["anchor", "drywall", "1/4"],
  "tile anchor": ["anchor", "tile", "ridge-it"],
  "roof anchor": ["anchor", "bracket", "roof"],
  
  // Clips
  "grip clip": ["clip", "screw clip", "1/2", "fiber", "cat"],
  "screw clip": ["grip clip", "clip", "cable"],
  "cable clip": ["clip", "grip", "screw"],
  
  // Cinder Block
  "cinder block": ["block", "concrete"],
  "block": ["cinder", "concrete"],
};

// =============================================================================
// SPLICING EQUIPMENT SYNONYMS
// =============================================================================
export const splicingSynonyms: Record<string, string[]> = {
  // Splice Closures
  "splice": ["closure", "fosc", "ofdc", "tray"],
  "closure": ["splice", "fosc", "ofdc", "a4", "b8", "c6", "c12", "d6"],
  "splice closure": ["closure", "fosc", "ofdc"],
  "fosc": ["closure", "splice", "fiber optic"],
  "ofdc": ["closure", "splice", "fiber"],
  
  // Closure types
  "a4": ["closure", "splice", "a-4"],
  "a-4": ["a4", "closure", "splice"],
  "b8": ["closure", "splice", "b-8"],
  "b-8": ["b8", "closure", "splice"],
  "c6": ["closure", "splice", "c-6"],
  "c-6": ["c6", "closure", "splice"],
  "c12": ["closure", "splice", "c-12"],
  "c-12": ["c12", "closure", "splice"],
  "d6": ["closure", "splice", "d-6"],
  "d-6": ["d6", "closure", "splice"],
  
  // Splice Trays
  "tray": ["splice", "fusion", "24", "72", "ribbon"],
  "splice tray": ["tray", "fusion", "24", "72"],
  "fusion tray": ["tray", "splice", "24"],
  
  // Pigtails
  "pigtail": ["pig tail", "fiber", "lc", "sc", "simplex", "12 fiber"],
  "pig tail": ["pigtail", "fiber"],
  "lc pigtail": ["pigtail", "lc", "upc", "apc"],
  "sc pigtail": ["pigtail", "sc", "upc", "apc"],
  
  // Splitters
  "splitter": ["plc", "1x2", "1x4", "1x8", "bare", "blockless"],
  "plc": ["splitter", "planar", "lightwave"],
  "1x2": ["splitter", "1:2", "2 way"],
  "1x4": ["splitter", "1:4", "4 way"],
  "1x8": ["splitter", "1:8", "8 way"],
  "bare splitter": ["splitter", "bare", "plc"],
  "blockless": ["splitter", "plc", "bare"],
  
  // Protection Sleeves
  "sleeve": ["splice", "protection", "heat shrink", "1.2", "1.5", "60mm", "40mm"],
  "protection sleeve": ["sleeve", "splice", "fusion"],
  "splice sleeve": ["sleeve", "protection", "heat shrink"],
  
  // Fiber Panels
  "fiber panel": ["panel", "adapter", "lc", "sc", "fhd", "rack"],
  "adapter panel": ["panel", "fiber", "lc", "sc"],
  "fhd panel": ["panel", "fiber", "lc", "sc", "fhd"],
  "lc panel": ["panel", "fiber", "lc", "duplex"],
  "sc panel": ["panel", "fiber", "sc", "apc", "upc"],
  "blank panel": ["panel", "fiber", "blank"],
  
  // Attenuators
  "attenuator": ["db", "lc", "sc", "10db", "apc", "upc"],
  "10db": ["attenuator", "10 db"],
  
  // Fiber Cable
  "fiber cable": ["fiber", "count", "ribbon", "sm", "single mode"],
  "ribbon": ["fiber", "144", "288", "count"],
  "12 count": ["fiber", "12 ct", "r-12"],
  "48 count": ["fiber", "48 ct", "r-48"],
  "72 count": ["fiber", "72 ct", "r-72"],
  "96 count": ["fiber", "96 ct", "r-96"],
  "144 count": ["fiber", "144 ct", "r-144"],
  "288 count": ["fiber", "288 ct", "r-288"],
  "adss": ["fiber", "all dielectric", "self supporting", "36"],
  
  // Patch Cables
  "patch cable": ["fiber", "jumper", "lc", "sc", "duplex", "simplex"],
  "jumper": ["patch cable", "fiber", "patch"],
  "fiber patch": ["patch cable", "jumper", "fiber"],
  "lc patch": ["patch cable", "lc", "upc", "apc"],
  "sc patch": ["patch cable", "sc", "upc", "apc"],
  "duplex": ["patch", "fiber", "lc", "sc", "2 fiber"],
  "simplex": ["patch", "fiber", "lc", "sc", "single"],
  
  // Connectors
  "lc": ["connector", "fiber", "upc", "apc", "duplex"],
  "sc": ["connector", "fiber", "upc", "apc"],
  "upc": ["connector", "lc", "sc", "blue"],
  "apc": ["connector", "lc", "sc", "green", "angle"],
  "hardened connector": ["connector", "fiber", "outdoor", "opti-tap"],
  
  // Adapters
  "fiber adapter": ["adapter", "coupler", "lc", "sc", "flange"],
  "coupler": ["adapter", "fiber", "connector"],
  
  // OLT
  "olt": ["optical line", "transceiver", "gpon", "xgs", "sfp"],
  "gpon": ["olt", "transceiver", "class b", "class c"],
  "xgs-pon": ["olt", "transceiver", "xgs", "calix"],
  
  // Tools
  "cleaver": ["fiber", "splice", "fusion", "tool"],
  "slitter": ["fiber", "mid span", "tool", "stripper"],
  "stripper": ["fiber", "slitter", "tool", "cable"],
  "one click": ["cleaner", "fiber", "sc", "lc", "2.5mm"],
  "fiber cleaner": ["one click", "cleaner", "wipe"],
  
  // Snowshoe / Storage
  "snowshoe": ["fiber", "storage", "16\""],
  "fiber storage": ["snowshoe", "storage", "unit"],
  
  // EZEntry
  "ezentry": ["entry", "enclosure", "16/16"],
  
  // OTE
  "ote": ["optical termination", "enclosure", "mini", "splitter"],
  "optical termination": ["ote", "enclosure"],
};

// =============================================================================
// OTHER EQUIPMENT SYNONYMS
// =============================================================================
export const otherSynonyms: Record<string, string[]> = {
  // Networking - Switches
  "switch": ["network switch", "managed", "poe switch", "unifi", "mikrotik", "cisco"],
  "network switch": ["switch", "managed", "poe"],
  "poe switch": ["switch", "poe", "power over ethernet"],
  "unifi switch": ["switch", "ubiquiti", "unifi"],
  "mikrotik": ["router", "switch", "crs", "rb"],
  "cisco": ["router", "switch", "n540", "n520"],
  
  // Networking - Routers
  "router": ["gateway", "firewall", "switch", "mikrotik", "cisco"],
  "gateway": ["router", "firewall"],
  "firewall": ["router", "gateway", "security"],
  
  // Networking - General
  "ethernet": ["cat 5", "cat 6", "cat5", "cat6", "patch cable", "network cable", "rj45", "utp"],
  "network cable": ["cat 5", "cat 6", "cat5", "cat6", "patch cable", "ethernet", "utp"],
  "cat5": ["cat 5", "ethernet", "network", "rj45"],
  "cat5e": ["cat5", "ethernet", "network", "rj45"],
  "cat6": ["cat 6", "ethernet", "network", "rj45"],
  "shielded": ["stp", "cat5", "cat6", "outdoor"],
  "patch": ["cable", "patch cable", "cat5", "cat6", "short"],
  
  // Cable lengths
  "1 ft": ["1ft", "1'", "foot", "patch"],
  "2 ft": ["2ft", "2'", "foot", "patch"],
  "3 ft": ["3ft", "3'", "foot", "patch"],
  "5 ft": ["5ft", "5'", "foot", "patch"],
  "6 ft": ["6ft", "6'", "foot", "patch"],
  "7 ft": ["7ft", "7'", "foot", "patch"],
  "10 ft": ["10ft", "10'", "foot", "patch"],
  
  // SFP
  "sfp": ["transceiver", "module", "10g", "1g", "optical"],
  "transceiver": ["sfp", "module", "10g", "1g"],
  "10g sfp": ["sfp", "10g", "transceiver", "lr", "sr"],
  "qsfp": ["transceiver", "100g", "40g"],
  "copper sfp": ["sfp", "rj45", "1000base-t"],
  
  // Wireless - Ubiquiti
  "ubiquiti": ["unifi", "uisp", "wave", "airfiber", "ltu", "powerbeam"],
  "unifi": ["ubiquiti", "ap", "switch", "dream machine"],
  "wave": ["ubiquiti", "onu", "60ghz", "ap", "pico", "nano", "lr"],
  "airfiber": ["ubiquiti", "af", "11", "24", "backhaul"],
  "ltu": ["ubiquiti", "rocket", "wireless"],
  "powerbeam": ["ubiquiti", "5ac", "bridge"],
  "nanostation": ["ubiquiti", "nano", "5ac", "loco"],
  
  // Wireless - Access Points
  "access point": ["ap", "wifi", "wireless", "unifi", "ubiquiti"],
  "ap": ["access point", "wifi", "wireless"],
  "wifi": ["wireless", "wi-fi", "access point", "ap", "router", "ubiquiti", "unifi"],
  "wireless": ["wifi", "wi-fi", "radio", "access point", "ap"],
  
  // Wireless - Backhaul
  "backhaul": ["radio", "ceragon", "siklu", "bridgewave", "mimosa", "airfiber"],
  "radio": ["wireless", "antenna", "ubiquiti", "cambium", "mikrotik", "backhaul"],
  "ceragon": ["backhaul", "radio", "ip-20", "antenna"],
  "siklu": ["backhaul", "radio", "eh", "antenna", "60ghz", "70ghz", "80ghz"],
  "bridgewave": ["backhaul", "radio", "80ghz", "antenna"],
  "mimosa": ["backhaul", "radio", "b11", "bridge"],
  "cambium": ["radio", "3000", "cbrs", "ptp"],
  
  // Antennas
  "antenna": ["radio", "wireless", "dish", "sector", "omni"],
  "dish": ["antenna", "parabolic", "backhaul"],
  "sector": ["antenna", "rf elements", "ubiquiti"],
  "omni": ["antenna", "omnidirectional"],
  
  // Power - POE
  "poe": ["power over ethernet", "injector", "power supply", "48v", "24v", "56v"],
  "power over ethernet": ["poe", "injector"],
  "poe injector": ["poe", "injector", "24v", "48v", "54v", "56v"],
  "injector": ["poe", "power", "24v", "48v"],
  "24v poe": ["poe", "injector", "24v", "ubiquiti"],
  "48v poe": ["poe", "injector", "48v", "ubnt"],
  "54v poe": ["poe", "injector", "54v"],
  "56v poe": ["poe", "injector", "56v", "phihong"],
  
  // Power - Supplies
  "power supply": ["psu", "meanwell", "adapter", "brick"],
  "psu": ["power supply", "meanwell"],
  "meanwell": ["power supply", "hlg", "lrs", "sp"],
  "adapter": ["power", "supply", "brick"],
  
  // Power - UPS/Battery
  "ups": ["battery", "backup", "uninterruptible", "alpha", "cyberpower"],
  "battery backup": ["ups", "uninterruptible"],
  "battery": ["ups", "backup", "agm", "lithium", "12v", "lifepo4", "centennial", "powersafe"],
  "alpha": ["ups", "battery", "650", "2000", "fxm"],
  "lithium": ["battery", "lifepo4", "power queen"],
  "agm": ["battery", "centennial", "12v"],
  
  // Power - DC/Converters
  "dc converter": ["converter", "dc-dc", "48v", "24v", "meanwell"],
  "converter": ["dc", "dc-dc", "isolated"],
  "inverter": ["ict", "ac", "300", "site"],
  
  // Power - Distribution
  "pdu": ["power distribution", "rack", "outlet", "switched"],
  "power distribution": ["pdu", "rack"],
  "breaker panel": ["ict", "distribution", "db"],
  
  // Enclosures
  "enclosure": ["box", "housing", "case", "cabinet", "nema", "8x5"],
  "cabinet": ["enclosure", "rack", "box"],
  "nema": ["enclosure", "outdoor", "weatherproof"],
  
  // Racks
  "rack": ["server", "19 inch", "cabinet", "shelf", "rail"],
  "server rack": ["rack", "19", "cabinet"],
  "rack shelf": ["shelf", "rack", "19"],
  "cable manager": ["rack", "1u", "cable management"],
  "lacing bar": ["rack", "cable", "management", "l shaped"],
  
  // Tools
  "drill": ["driver", "impact", "screw gun", "bit"],
  "driver": ["drill", "impact", "screwdriver", "1/2", "1/4", "3/8", "7/16"],
  "bit": ["drill", "masonry", "wood", "1/2", "3/8", "7/32"],
  "masonry bit": ["bit", "drill", "concrete", "masonry"],
  "wood bit": ["bit", "drill", "wood"],
  "socket": ["wrench", "7/16", "13mm"],
  "wrench": ["socket", "adjustable", "crescent", "ratcheting"],
  "ratcheting wrench": ["wrench", "ratchet", "10mm", "8mm"],
  "screwdriver": ["driver", "6 in 1", "phillips", "flathead"],
  "crimper": ["crimp", "crimping tool", "rj45 tool"],
  "punchdown": ["tool", "punch", "keystone", "110"],
  "probe": ["pick", "jonard", "tool"],
  "can wrench": ["wrench", "can", "tool"],
  "security tool": ["tool", "bit", "tamper"],
  "drywall saw": ["saw", "drywall", "tool"],
  "stud finder": ["finder", "stud", "tool"],
  "hammer": ["tool", "mallet"],
  
  // Tape
  "tape": ["electrical tape", "friction", "duct", "mastic", "rubber"],
  "electrical tape": ["tape", "vinyl", "insulating"],
  "rubber tape": ["tape", "electrical", "rubber"],
  "duct tape": ["tape", "duck"],
  "mastic": ["tape", "coax seal", "weatherproof"],
  "coax seal": ["mastic", "seal", "tape"],
  
  // Caulk/Sealant
  "caulk": ["silicone", "sealant", "clear"],
  "silicone": ["caulk", "sealant", "clear"],
  "sealant": ["silicone", "caulk"],
  
  // Connectors - RJ45
  "rj45 connector": ["rj45", "end", "pass through", "shielded"],
  "pass through": ["rj45", "connector", "pass-through"],
  "shielded connector": ["rj45", "stp", "connector"],
  
  // Couplers
  "rj45 coupler": ["coupler", "keystone", "shielded", "waterproof"],
  "waterproof coupler": ["coupler", "ip68", "outdoor"],
  
  // Media Converter
  "media converter": ["converter", "fiber", "ethernet", "umc"],
  
  // Surge Protection
  "surge protector": ["surge", "eth-sp", "protection", "lightning"],
  "surge": ["protector", "suppressor", "lightning"],
  
  // Safety/PPE
  "ppe": ["safety", "gloves", "glasses", "vest", "hard hat"],
  "booties": ["shoe cover", "booties", "disposable"],
  "shoe cover": ["booties", "cover"],
  
  // Misc
  "alcohol": ["isopropyl", "cleaner", "ipa"],
  "isopropyl": ["alcohol", "ipa", "cleaner"],
  "paint": ["marking", "spray", "orange", "fluorescent"],
  "marking paint": ["paint", "spray", "locate"],
};

// =============================================================================
// COMBINED SYNONYMS (merges all categories)
// =============================================================================
export const equipmentSynonyms: Record<string, string[]> = {
  ...aerialSynonyms,
  ...undergroundSynonyms,
  ...installingSynonyms,
  ...splicingSynonyms,
  ...otherSynonyms,
};

// =============================================================================
// SEARCH HELPER FUNCTIONS
// =============================================================================

/**
 * Expands a search query with synonyms.
 * Returns an array of terms to search for (including the original query).
 */
export function expandSearchQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim();
  const terms = new Set<string>([lowerQuery]);
  
  // Check if the query matches any synonym keys exactly
  const exactSynonyms = equipmentSynonyms[lowerQuery];
  if (exactSynonyms) {
    exactSynonyms.forEach(term => terms.add(term.toLowerCase()));
  }
  
  // Check for partial matches in synonym keys
  for (const [key, values] of Object.entries(equipmentSynonyms)) {
    // If query contains a synonym key or vice versa
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      values.forEach(term => terms.add(term.toLowerCase()));
      terms.add(key); // Also add the key itself
    }
  }
  
  // Special handling for size-based searches (e.g., "14 inch", "14\"", "14in")
  const sizeMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:inch|in|"|''|ft|foot|feet|')?/i);
  if (sizeMatch) {
    const size = sizeMatch[1];
    // Add common size format variations
    terms.add(`${size}"`);
    terms.add(`${size}''`);
    terms.add(`${size} inch`);
    terms.add(`${size}in`);
    terms.add(`${size} in`);
    terms.add(`x ${size}`);
    terms.add(`x${size}`);
    terms.add(`${size}'`);
    terms.add(`${size} ft`);
    terms.add(`${size}ft`);
    terms.add(`${size} foot`);
  }
  
  return Array.from(terms);
}

/**
 * Checks if an equipment item matches the search query (including synonyms).
 * 
 * For multi-word queries, meaningful words must match (either directly or via synonyms).
 * Size + unit combinations (e.g., "14 inch") are treated as a single size term.
 */
export function matchesWithSynonyms(
  item: { name: string; sku: string; description?: string | null },
  query: string
): boolean {
  if (!query.trim()) return true;
  
  const searchableText = `${item.name} ${item.sku} ${item.description || ""}`.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  
  // First, check if the exact query matches (fastest path)
  if (searchableText.includes(lowerQuery)) return true;
  
  // Normalize the query - convert "14 inch" to just size check, etc.
  // Pattern: number + optional space + unit word
  const normalizedQuery = lowerQuery
    .replace(/(\d+(?:\.\d+)?)\s*(inch|inches|in|"|''|ft|foot|feet|')/gi, '_SIZE_')
    .replace(/_SIZE_\s*_SIZE_/g, '_SIZE_'); // Dedupe if multiple patterns matched
  
  // Split into words, filtering out the size placeholders
  const words = normalizedQuery.split(/\s+/).filter(w => w.length > 0 && !w.includes('_SIZE_'));
  
  // Extract size numbers from original query
  const sizeMatches = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:inch|inches|in|"|''|ft|foot|feet|')?/gi);
  const sizes: string[] = sizeMatches 
    ? Array.from(new Set(sizeMatches.map(m => m.match(/(\d+(?:\.\d+)?)/)?.[1]).filter((s): s is string => !!s)))
    : [];
  
  // If query is just a size with no other words, check size variations
  if (words.length === 0 && sizes.length > 0) {
    return sizes.every(size => checkSizeMatch(searchableText, size));
  }
  
  // Check that all non-size words match
  const wordsMatch = words.length === 0 || words.every(word => {
    // Direct match
    if (searchableText.includes(word)) return true;
    
    // Synonym match
    const synonyms = equipmentSynonyms[word];
    if (synonyms && synonyms.some(syn => searchableText.includes(syn.toLowerCase()))) {
      return true;
    }
    
    return false;
  });
  
  // Check that all sizes match
  const sizesMatch = sizes.length === 0 || sizes.every(size => checkSizeMatch(searchableText, size));
  
  return wordsMatch && sizesMatch;
}

/**
 * Check if a size value matches in the text (handles various formats)
 */
function checkSizeMatch(text: string, size: string): boolean {
  const sizeVariations = [
    `${size}"`,           // 14"
    `${size}''`,          // 14''
    `${size} inch`,       // 14 inch
    `${size}inch`,        // 14inch
    `${size}in`,          // 14in
    `${size} in`,         // 14 in
    `x ${size}`,          // x 14
    `x${size}`,           // x14
    ` ${size} `,          // standalone number
    `${size}'`,           // 14' (feet)
    `${size} ft`,         // 14 ft
    `${size}ft`,          // 14ft
    `${size} foot`,       // 14 foot
    `${size}x`,           // 14x (dimensions)
    `-${size}`,           // -14 (in SKUs)
    `${size}-`,           // 14- (in SKUs)
  ];
  return sizeVariations.some(v => text.includes(v));
}

/**
 * Get category for a synonym (useful for organizing search results)
 */
export function getSynonymCategory(term: string): string {
  const lowerTerm = term.toLowerCase();
  if (aerialSynonyms[lowerTerm]) return "aerial";
  if (undergroundSynonyms[lowerTerm]) return "underground";
  if (installingSynonyms[lowerTerm]) return "installing";
  if (splicingSynonyms[lowerTerm]) return "splicing";
  if (otherSynonyms[lowerTerm]) return "other";
  return "unknown";
}
