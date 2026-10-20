const A = (id, name, type, x, z, o = {}) => ({
  id,
  name,
  type,
  x,
  z,
  pressure: 64,
  flow: 2000,
  risk: 20,
  zone: "—",
  inspected: "12 Sep 2026",
  ...o,
});
export const assets = [
  A("WTP-1", "Cairo Water Treatment Plant", "plant", -14, -6, {
    flow: 9200,
    pressure: 72,
    risk: 14,
    zone: "Source",
    inspected: "02 Sep 2026",
  }),
  A("WTP-2", "Maadi Treatment Plant", "plant", -14, 7, {
    flow: 7800,
    pressure: 70,
    risk: 18,
    zone: "Source",
  }),
  A("RS-1", "Reservoir North", "reservoir", -7, -8, {
    flow: 5400,
    pressure: 58,
    risk: 12,
    zone: "Storage",
  }),
  A("RS-2", "Reservoir Central", "reservoir", -7, 0, {
    flow: 6100,
    pressure: 60,
    risk: 16,
    zone: "Storage",
  }),
  A("RS-3", "Reservoir South", "reservoir", -7, 8, {
    flow: 5200,
    pressure: 57,
    risk: 22,
    zone: "Storage",
  }),
  A("WT-1", "Water Tower 01", "tower", 1, -3, {
    flow: 1800,
    pressure: 74,
    risk: 15,
    zone: "Zone 03",
  }),
  A("WT-2", "Water Tower 02", "tower", 1, 3.5, {
    flow: 1700,
    pressure: 73,
    risk: 18,
    zone: "Zone 05",
  }),
  A("PS-01", "Pump Station 01", "pump", -1, -8, {
    flow: 2600,
    pressure: 66,
    risk: 19,
    zone: "Zone 01",
  }),
  A("PS-02", "Pump Station 02", "pump", -1, 0, {
    flow: 3100,
    pressure: 63,
    risk: 24,
    zone: "Zone 05",
  }),
  A("PS-03", "Pump Station 03", "pump", -1, 8, {
    flow: 2700,
    pressure: 65,
    risk: 21,
    zone: "Zone 07",
  }),
  A("PS-04", "Pump Station 04", "pump", 3, 6, {
    flow: 2840,
    pressure: 68,
    risk: 31,
    zone: "Zone 07",
    inspected: "18 Sep 2026",
  }),
  A("PS-05", "Pump Station 05", "pump", 3, -5, {
    flow: 3300,
    pressure: 67,
    risk: 17,
    zone: "Zone 03",
  }),
  A("PS-06", "Pump Station 06", "pump", 3, 0.5, {
    flow: 3000,
    pressure: 64,
    risk: 26,
    zone: "Zone 05",
  }),
];
const Z = (n, x, z, risk, pressure, flow) => ({
  id: "Z0" + n,
  name: "Zone 0" + n,
  x,
  z,
  risk,
  pressure,
  flow,
  zone: "Zone 0" + n,
});
export const zones = [
  Z(1, 7, -9, 15, 66, 2500),
  Z(2, 12, -9, 22, 63, 2300),
  Z(3, 7, -4, 18, 65, 3100),
  Z(4, 12, -4, 28, 61, 2900),
  Z(5, 7, 1, 25, 64, 3400),
  Z(6, 12, 1, 19, 62, 2700),
  Z(7, 8, 7, 34, 66, 3200),
  Z(8, 13, 7, 21, 63, 2600),
];
const P = (id, a, b, flow) => ({ id, a, b, flow });
export const pipes = [
  P("P-101", "WTP-1", "RS-1", 6200),
  P("P-102", "WTP-1", "RS-2", 3000),
  P("P-103", "WTP-2", "RS-2", 3100),
  P("P-104", "PS-04", "Z07", 3200),
  P("P-105", "WTP-2", "RS-3", 4700),
  P("P-106", "RS-1", "PS-01", 5400),
  P("P-107", "RS-2", "PS-02", 6100),
  P("P-108", "RS-3", "PS-03", 5200),
  P("P-109", "PS-01", "PS-05", 2600),
  P("P-110", "PS-02", "PS-06", 3100),
  P("P-111", "PS-03", "PS-04", 2700),
  P("P-112", "PS-05", "Z01", 1600),
  P("P-113", "PS-05", "Z03", 1700),
  P("P-114", "PS-06", "Z05", 1700),
  P("P-115", "PS-06", "Z04", 1400),
  P("P-116", "Z07", "Z08", 1300),
  P("P-117", "Z01", "Z02", 900),
  P("P-118", "Z03", "Z04", 800),
  P("P-119", "Z05", "Z06", 900),
  P("P-120", "PS-04", "Z05", 1000),
  P("P-121", "PS-05", "WT-1", 1800),
  P("P-122", "PS-06", "WT-2", 1700),
  P('P-123','PS-03','Z07',2400)   // TODO: replace with the real registry pipe feeding Z07
];
export const sensors = [
  ["S-01", "P-101"],
  ["S-02", "P-106"],
  ["S-03", "P-107"],
  ["S-04", "P-104"],
  ["S-05", "P-109"],
  ["S-06", "P-112"],
  ["S-07", "P-114"],
  ["S-08", "P-116"],
  ["S-09", "P-108"],
  ["S-10", "P-119"],
].map(([id, pipe]) => ({ id, pipe, u: 0.5 }));
export const nodeById = Object.fromEntries(
  [...assets, ...zones].map((n) => [n.id, n]),
);
// ---- Asset registry model (mock now; replace with a DB table / API later) ----
let _s = 11;
const rnd = () => (_s = (_s * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)],
  clamp = (v) => Math.max(0, Math.min(1, v));
const MAT = {
  "Cast iron": 1,
  "Asbestos cement": 0.9,
  Steel: 0.6,
  Concrete: 0.45,
  "Ductile iron": 0.35,
  HDPE: 0.15,
};
const PM = ["Cast iron", "Asbestos cement", "Steel", "Ductile iron", "HDPE"],
  AM = ["Concrete", "Steel"];
const STAR = {
  "PS-04": [2003, "Steel", 5, 0.9, 6.5],
  "P-104": [1998, "Cast iron", 5, 0.85, 4.2],
  Z07: [2001, "Cast iron", 4, 0.9, 11],
};
const BASE = { plant: 40, reservoir: 18, tower: 9, pump: 6, zone: 8 };
function enrich(n, kind) {
  const k = n.type || kind;
  const [year, material, failures, served, cost] = STAR[n.id] || [
    1985 + Math.floor(rnd() * 35),
    pick(kind === "asset" ? AM : PM),
    Math.floor(rnd() * 4),
    0.25 + rnd() * 0.6,
    +(
      (k === "pipe" ? 2 + n.flow / 1500 : BASE[k]) *
      (0.8 + rnd() * 0.4)
    ).toFixed(1),
  ];
  const drv = {
    age: clamp((2026 - year) / 45),
    fail: clamp(failures / 5),
    mat: MAT[material],
    crit: served,
  };
  Object.assign(n, {
    year,
    material,
    failures,
    served,
    cost,
    drv,
    risk: Math.round(
      100 * (0.3 * drv.age + 0.3 * drv.fail + 0.2 * drv.mat + 0.2 * drv.crit),
    ),
  });
}
assets.forEach((a) => enrich(a, "asset"));
zones.forEach((z) => enrich(z, "zone"));
pipes.forEach((p) => {
  p.type = "pipe";
  p.name = "Pipeline " + p.id;
  enrich(p, "pipe");
});
export const items = [...assets, ...zones, ...pipes];
export const byId = Object.fromEntries(items.map((i) => [i.id, i]));
export const posOf = (id) => {
  const n = nodeById[id];
  if (n) return { x: n.x, z: n.z };
  const p = byId[id],
    a = nodeById[p.a],
    b = nodeById[p.b];
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
};
export const RENEWED = 8;
const prio = (i) => (i.risk * (0.5 + 0.5 * i.served)) / i.cost;
export function computePlan(budget) {
  const eligible = items.filter((i) => i.risk >= 40);
  let spent = 0;
  const ids = [];
  [...eligible]
    .sort((a, b) => b.risk - a.risk || prio(b) - prio(a))
    .forEach((i) => {
      if (spent + i.cost <= budget) {
        ids.push(i.id);
        spent += i.cost;
      }
    });
  const set = new Set(ids),
    after = (i) => (set.has(i.id) ? RENEWED : i.risk),
    sum = (f) => items.reduce((t, i) => t + f(i), 0);
  return {
    ids,
    set,
    spent: +spent.toFixed(1),
    avgBefore: Math.round(sum((i) => i.risk) / items.length),
    avgAfter: Math.round(sum(after) / items.length),
    highBefore: items.filter((i) => i.risk >= 65).length,
    highAfter: items.filter((i) => after(i) >= 65).length,
    eligibleCount: eligible.length,
    fullCoverageBudget: +eligible
      .reduce((total, i) => total + i.cost, 0)
      .toFixed(1),
  };
}
