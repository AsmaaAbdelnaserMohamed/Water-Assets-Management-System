import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CircleHelp,
  ClipboardList,
  GitBranch,
  MapPin,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  Waypoints,
  X,
} from "lucide-react";
import Scene from "./DigitalTwinScene";
import { focusAt, OVERVIEW } from "./sceneCamera";
import { byId, posOf } from "../data/network";
import {
  emergencyAssets,
  affectedZoneSupply,
  emergencyImpact,
  emergencyIncident,
  emergencyRoute,
} from "../data/emergency";
import { useT } from "../i18n";

const STATUS_OPTIONS = [
  "Reported",
  "Under Assessment",
  "Response Plan Proposed",
  "Awaiting Engineering Approval",
  "In Progress",
  "Resolved",
];

const ACTIONS = [
  [
    "Verify the report and confirm the exact location.",
    "Confirm incident location",
    true,
  ],
  [
    "Assess isolation points and obtain operator approval before isolating any asset.",
    "Isolation assessment",
    true,
  ],
  [
    "Validate route connectivity, capacity, and hydraulic constraints before any diversion.",
    "Route feasibility",
    true,
  ],
  [
    "Check pressure, flow, and service-area impacts with current telemetry or a hydraulic model.",
    "Impact validation",
    true,
  ],
  [
    "Notify the responsible emergency response and maintenance teams.",
    "Team notification",
    false,
  ],
  [
    "Dispatch an inspection or repair team after the incident is confirmed.",
    "Field inspection",
    true,
  ],
  [
    "Communicate any confirmed service interruption to affected customers.",
    "Customer communication",
    true,
  ],
  [
    "Monitor restoration and record verified operational updates.",
    "Restoration monitoring",
    true,
  ],
];


const SCAN_DURATION = 4900; // one full left→right pass of the 3D scan bar

const SCAN_STEPS = [
  ["فحص الأنابيب والوصلات", "Scanning pipes and junctions"],
  ["تحليل التدفق والضغط (بيانات تجريبية)", "Analyzing flow and pressure (sample data)"],
  ["تحديد الأصل المتضرر", "Locating the damaged asset"],
  ["البحث عن مسار بديل", "Searching for an alternative route"],
  ["تقدير المناطق المتأثرة", "Estimating affected areas"],
];

const AI_SCAN_CSS = `
.ai-scan-btn{position:absolute;right:14px;bottom:14px;z-index:12;display:flex;align-items:center;gap:8px;padding:11px 20px;border:1px solid rgba(34,211,238,.7);border-radius:999px;background:linear-gradient(135deg,#0b5fa8,#0e9ad8);color:#fff;font-weight:600;font-size:14px;line-height:1;font-family:inherit;cursor:pointer;box-shadow:0 0 0 0 rgba(34,211,238,.55),0 6px 20px rgba(0,0,0,.35);animation:aiPulse 2s infinite}
.ai-scan-btn:hover{filter:brightness(1.12)}
.ai-scan-btn:disabled{animation:none;opacity:.75;cursor:wait}
.ai-scan-btn.done{animation:none;background:rgba(10,30,50,.9)}
@keyframes aiPulse{0%{box-shadow:0 0 0 0 rgba(34,211,238,.5),0 6px 20px rgba(0,0,0,.35)}70%{box-shadow:0 0 0 14px rgba(34,211,238,0),0 6px 20px rgba(0,0,0,.35)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0),0 6px 20px rgba(0,0,0,.35)}}
.ai-scan-card{position:absolute;top:56px;left:14px;z-index:12;width:min(340px,calc(100% - 28px));padding:12px 14px;border-radius:10px;border:1px solid rgba(56,189,248,.3);background:rgba(8,16,28,.88);backdrop-filter:blur(6px);color:#dbeafe;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.ai-scan-title{margin:0 0 8px;padding-inline-end:22px;font-size:13px;font-weight:700;letter-spacing:.03em;color:#e6f4ff}
.ai-scan-title small{display:block;margin-top:2px;font-size:11px;font-weight:500;opacity:.65;letter-spacing:0}
.ai-scan-bar{height:5px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:8px 0 10px}
.ai-scan-bar>i{display:block;height:100%;background:linear-gradient(90deg,#0e9ad8,#22d3ee);transition:width .08s linear}
.ai-scan-steps{list-style:none;margin:0;padding:0;display:grid;gap:5px;font-size:12px}
.ai-scan-steps li{display:flex;align-items:center;gap:6px;opacity:.4}
.ai-scan-steps li.active{opacity:1;color:#22d3ee}.ai-scan-steps li.done{opacity:.85}
.ai-scan-result-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid rgba(255,255,255,.1);font-size:12.5px}
.ai-scan-result-row span{opacity:.7}.ai-scan-result-row b{text-align:end}
.ai-scan-result-row.bad b{color:#f87171}.ai-scan-result-row.good b{color:#34d399}
.ai-scan-close{position:absolute;top:8px;inset-inline-end:8px;background:none;border:0;color:#cfe8ff;cursor:pointer;padding:4px;line-height:0}
.ai-scan-note{margin:8px 0 0;font-size:11px;opacity:.6}
`;

function InformationRow({ label, children }) {
  return (
    <div className="emergency-info-row">
      <span>{label}</span>
      <b>{children}</b>
    </div>
  );
}

export default function EmergencyResponse({
  lang,
  sat,
  showBuildings,
  onToggleBuildings,
  onToggleSatellite,
}) {
  const { t } = useT();
  const [status, setStatus] = useState(emergencyIncident.status);
  const [analyzed, setAnalyzed] = useState(false);
  const [recommendationsReady, setRecommendationsReady] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(false);
  const [compare, setCompare] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef(null);
  const ar = lang === "ar";
  useEffect(() => () => clearInterval(timerRef.current), []);
  const [selectedId, setSelectedId] = useState(
    emergencyIncident.damagedAssetId,
  );
  const [focus, setFocus] = useState(() => {
    const { x, z } = posOf(emergencyIncident.damagedAssetId);
    return focusAt(x, z, 13);
  });
  const selected = byId[selectedId];
  const positionFor = (id) => posOf(id);
  const fmt = (n) => n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
  const impactedNames = emergencyImpact.affectedAreas.map(
    (id) => byId[id]?.name ?? id,
  );
  const emergency = useMemo(
    () => ({
      damagedId: emergencyIncident.damagedAssetId,
      alternativeIds: emergencyRoute.pipeIds,
      reversedIds: emergencyRoute.reversedIds,
      downstreamIds: emergencyRoute.downstreamIds,
      affectedIds: emergencyImpact.affectedAreas,
      preview: analyzed && previewRoute,
      scanning,
      selectedId,
      onSelect: (id) => {
        setSelectedId(id);
        if (id) {
          const { x, z } = positionFor(id);
          setFocus(focusAt(x, z, 10));
        }
      },
    }),
    [analyzed, previewRoute, selectedId, scanning],
  );

  const scanStats = useMemo(() => {
    const items = Object.values(byId);
    return {
      total: items.length,
      pipes: items.filter((i) => i.type === "pipe").length,
    };
  }, []);

  const runAI = () => {
    if (scanning) return;
    clearInterval(timerRef.current);
    setShowResult(false);
    setScanProgress(0);
    setScanning(true);
    setFocus(OVERVIEW);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / SCAN_DURATION) * 100);
      setScanProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current);
        setScanning(false);
        setAnalyzed(true);
        setRecommendationsReady(true);
        setPreviewRoute(true);
        setStatus("Under Assessment");
        setShowResult(true);
        const { x, z } = posOf(emergencyIncident.damagedAssetId);
        setFocus(focusAt(x, z, 13));
      }
    }, 50);
  };

  const resetScenario = () => {
    clearInterval(timerRef.current);
    setScanning(false);
    setShowResult(false);
    setScanProgress(0);
    setStatus(emergencyIncident.status);
    setAnalyzed(false);
    setRecommendationsReady(false);
    setPreviewRoute(false);
    setCompare(false);
    setSelectedId(emergencyIncident.damagedAssetId);
    const { x, z } = posOf(emergencyIncident.damagedAssetId);
    setFocus(focusAt(x, z, 13));
  };

  const selectAsset = (id) => {
    setSelectedId(id);
    const { x, z } = positionFor(id);
    setFocus(focusAt(x, z, 10));
  };

  const isDamaged = selectedId === emergencyIncident.damagedAssetId;
  const step = emergencyRoute.steps.find((s) => s.pipeId === selectedId);
  const isAlternative = !!step;
  const connectedAssetNames =
    selected?.type === "pipe"
      ? [selected.a, selected.b].map((id) => byId[id]?.name ?? id)
      : [];
  return (
    <>
      <main className="emergency-main">
        <section className="stage emergency-stage">
          <Scene
            mode="overview"
            phase="idle"
            sel={null}
            onSel={() => {}}
            focus={focus}
            sat={sat}
            lang={lang}
            showBuildings={showBuildings}
            emergency={emergency}
          />
          <div className="tag">{t("SIMULATED EMERGENCY SCENARIO")}</div>
          <div className="emergency-map-tools">
            <span className="emergency-map-status">
              <i />
              {t("REPORTED INCIDENT")}
            </span>
            <button className={sat ? "on" : ""} onClick={onToggleSatellite}>
              {t("Satellite")}
            </button>
            <button
              className={showBuildings ? "on" : ""}
              onClick={onToggleBuildings}
            >
              {t(showBuildings ? "Hide buildings" : "Show buildings")}
            </button>
            <button onClick={() => setFocus(OVERVIEW)}>
              {t("Reset map view")}
            </button>
          </div>
          <div className="emergency-map-legend">
            <span>
              <i className="incident-dot" />
              {t("Damaged asset")}
            </span>
            {analyzed && <><span>
              <i className="route-dot" />
              {t("Proposed alternative route")}
            </span>
            <span>
              <i className="impact-dot" />
              {t("Potential impact area")}
            </span></>}
          </div>
          <style>{AI_SCAN_CSS}</style>
          <button
            className={`ai-scan-btn ${analyzed ? "done" : ""}`}
            onClick={runAI}
            disabled={scanning}
          >
            {analyzed ? <ScanLine size={17} /> : <Activity size={17} />}
            {scanning
              ? ar ? "جاري الفحص..." : "Scanning..."
              : analyzed
                ? ar ? "إعادة الفحص" : "Re-run scan"
                : ar ? "تشغيل الذكاء الاصطناعي" : "Run AI"}
          </button>

          {scanning && (
            <div className="ai-scan-card" dir={ar ? "rtl" : "ltr"}>
              <h4 className="ai-scan-title">
                AI Network Scan
                <small>{Math.floor(scanProgress)}%</small>
              </h4>
              <div className="ai-scan-bar">
                <i style={{ width: `${scanProgress}%` }} />
              </div>
              <ul className="ai-scan-steps">
                {SCAN_STEPS.map(([arText, enText], i) => {
                  const current = Math.min(
                    SCAN_STEPS.length - 1,
                    Math.floor(scanProgress / (100 / SCAN_STEPS.length)),
                  );
                  const state =
                    i < current ? "done" : i === current ? "active" : "";
                  return (
                    <li key={enText} className={state}>
                      {state === "done" ? <Check size={13} /> : <span style={{ width: 13 }} />}
                      {ar ? arText : enText}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!scanning && showResult && (
            <div className="ai-scan-card" dir={ar ? "rtl" : "ltr"}>
              <button
                className="ai-scan-close"
                onClick={() => setShowResult(false)}
                aria-label="close"
              >
                <X size={15} />
              </button>
              <h4 className="ai-scan-title">
                AI Scan Result — نتيجة فحص الذكاء الاصطناعي
              </h4>
              <div className="ai-scan-result-row">
                <span>{ar ? "الأصول التي تم فحصها" : "Assets scanned"}</span>
                <b>
                  {fmt(scanStats.total)} ({fmt(scanStats.pipes)}{" "}
                  {ar ? "خط أنابيب" : "pipes"})
                </b>
              </div>
              <div className="ai-scan-result-row bad">
                <span>{ar ? "أصل متضرر" : "Damaged asset"}</span>
                <b>{emergencyAssets.damaged.id}</b>
              </div>
              <div className="ai-scan-result-row good">
                <span>{ar ? "مسار بديل" : "Alternative route"}</span>
                <b>
                  {emergencyRoute.found
                    ? `${emergencyRoute.pipeIds.join(" → ")} · ${emergencyRoute.coverage}%`
                    : ar ? "لم يتم العثور على مسار" : "None found"}
                </b>
              </div>
              <div className="ai-scan-result-row">
                <span>{ar ? "مناطق خدمة محتمل تأثرها" : "Potentially affected areas"}</span>
                <b>{fmt(impactedNames.length)}</b>
              </div>
              <p className="ai-scan-note">
                {ar
                  ? "نتائج محاكاة لدعم القرار — تتطلب موافقة المهندس المسؤول."
                  : "Simulated decision-support results — engineer approval required."}
              </p>
            </div>
          )}
          {analyzed && compare && (
            <div
              className="scenario-comparison"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <span>
                <b>{t("Reported state")}</b>
                {t("P-104 reported damaged; no operational change confirmed.")}
              </span>
              <span>
                <b>{t("Proposed preview")}</b>
                {t(
                  "Existing route highlighted for review only; capacity is not validated and nothing is activated.",
                )}
              </span>
            </div>
          )}
        </section>

        <aside
          className="ai emergency-panel"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <div className="aih">
            <h2>{t("EMERGENCY RESPONSE")}</h2>
            <em>{t("SIMULATED · DECISION SUPPORT")}</em>
          </div>
          <div className="emergency-incident-heading">
            <div className="emergency-severity">
              <AlertTriangle size={15} />
              {t("PRELIMINARY HIGH SEVERITY")}
            </div>
            <h3>{t(emergencyIncident.type)}</h3>
            <span>
              <b>{emergencyIncident.id}</b> · {t("Reported")}:{" "}
              {emergencyIncident.reportedAt}
            </span>
          </div>

          <section className="emergency-section">
            <div className="emergency-section-title">
              <MapPin size={15} />
              <h3>{t("Incident assessment")}</h3>
            </div>
            <InformationRow label={t("Damaged asset")}>
              {emergencyAssets.damaged.id} · {t(emergencyAssets.damaged.name)}
            </InformationRow>
            <InformationRow label={t("Reported location")}>
              {t(emergencyIncident.location)}
            </InformationRow>
            <InformationRow label={t("Incident status")}>
              <span className="emergency-status-value">{t(status)}</span>
            </InformationRow>
            {analyzed && <><InformationRow label={t("Potentially affected service areas")}>
              {impactedNames.map(t).join(" · ")}
            </InformationRow>
            <p className="emergency-note">
              {t(
                "Impact areas are a simulated incident assumption based on the sample topology; no hydraulic model has verified service loss.",
              )}
            </p></>}
            <button
              className="emergency-secondary-button"
              onClick={() => selectAsset(emergencyIncident.damagedAssetId)}
            >
              <Search size={14} />
              {t("View Incident Details")}
            </button>
          </section>

          {analyzed && (
          <section className="emergency-section">
            <div className="emergency-section-title">
              <Waypoints size={15} />
              <h3>{t("Alternative route assessment")}</h3>
            </div>
            {!emergencyRoute.found ? (
              <p className="emergency-warning">
                {t(
                  "No alternative route made of existing pipelines was found in the network data.",
                )}
              </p>
            ) : (
              <>
                <div className="emergency-route-summary">
                  <b>{emergencyRoute.pipeIds.join(" → ")}</b>
                  <span>{t(emergencyRoute.suitability)}</span>
                </div>
                <p>{t(emergencyRoute.reason)}</p>
                <p className="emergency-warning">
                  {t(emergencyRoute.limitation)}
                </p>
                <InformationRow label={t("Alternative path")}>
                  {emergencyRoute.path
                    .map((id) =>
                      byId[id].type === "pipe" ? id : t(byId[id].name),
                    )
                    .join(" → ")}
                </InformationRow>
                <InformationRow label={t("Required flow · P-104 reference")}>
                  {fmt(emergencyRoute.requiredFlow)} {t("m³/h")}
                </InformationRow>
                <InformationRow label={t("Limiting segment · reference flow")}>
                  {emergencyRoute.bottleneckId} ·{" "}
                  {fmt(emergencyRoute.bottleneckFlow)} {t("m³/h")}
                </InformationRow>
                <InformationRow label={t("Indicative coverage")}>
                  {emergencyRoute.coverage}% · {t("not a rated capacity")}
                </InformationRow>
                <InformationRow label={t("Rated capacity / valves")}>
                  {t("Not verified")}
                </InformationRow>
                <InformationRow label={t("Operational status")}>
                  {t("Not confirmed")}
                </InformationRow>
                <button
                  className="emergency-secondary-button"
                  onClick={() => selectAsset(emergencyRoute.pipeIds.at(-1))}
                >
                  <GitBranch size={14} />
                  {t("Inspect alternative route")}
                </button>
              </>
            )}
            <button
              className="emergency-secondary-button"
              onClick={() => setPreviewRoute((value) => !value)}
            >
              <Activity size={14} />
              {t(
                previewRoute
                  ? "Hide alternative route preview"
                  : "Preview Alternative Route",
              )}
            </button>
          </section>

          )}

          {selected && (
            <section className="emergency-section emergency-selected-details">
              <div className="emergency-section-title">
                <ClipboardList size={15} />
                <h3>{t("Selected network item")}</h3>
              </div>
              <div className="emergency-selected-heading">
                <b>{selected.id}</b>
                <span>{t(selected.name)}</span>
              </div>
              {selected.type === "pipe" ? (
                <>
                  {isAlternative && (
                    <>
                      <InformationRow label={t("Route role")}>
                        {t("Existing alternative route")} ·{" "}
                        {emergencyRoute.steps.indexOf(step) + 1}/
                        {emergencyRoute.steps.length}
                      </InformationRow>
                      <InformationRow label={t("Operating direction")}>
                        {t(byId[step.from].name)} → {t(byId[step.to].name)}
                      </InformationRow>
                      <InformationRow label={t("Reference flow vs required")}>
                        {fmt(selected.flow)} /{" "}
                        {fmt(emergencyRoute.requiredFlow)} {t("m³/h")}
                      </InformationRow>
                      <InformationRow label={t("Network status")}>
                        {t(
                          "Existing asset · capacity and valves to be verified",
                        )}
                      </InformationRow>
                    </>
                  )}
                  <InformationRow label={t("Type / material")}>
                    {t("Pipeline")} · {t(selected.material)}
                  </InformationRow>
                  <InformationRow label={t("Reference flow · simulated")}>
                    {fmt(selected.flow)} {t("m³/h")}
                  </InformationRow>
                  <InformationRow label={t("Estimated cost")}>
                    {selected.cost} {t("M EGP")}
                  </InformationRow>
                  <InformationRow label={t("Connected assets")}>
                    {connectedAssetNames.map(t).join(" · ")}
                  </InformationRow>
                  <InformationRow label={t("Diameter / rated capacity")}>
                    {t("Unavailable in current sample data")}
                  </InformationRow>
                  {isDamaged && (
                    <p className="emergency-warning">
                      {t(
                        "Incident is reported only; isolation and field condition are not verified.",
                      )}
                    </p>
                  )}
                  {isAlternative && (
                    <p className="emergency-note">
                      {t(
                        "This existing pipeline is part of the proposed supply path. Confirm its diameter, rated capacity, and valve status before relying on it.",
                      )}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <InformationRow label={t("Installed")}>
                    {selected.year}
                  </InformationRow>
                  <InformationRow label={t("Material")}>
                    {t(selected.material)}
                  </InformationRow>
                  <InformationRow label={t("Previous failures")}>
                    {selected.failures}
                  </InformationRow>
                  <InformationRow label={t("Risk")}>
                    {selected.risk}% · {t("sample score")}
                  </InformationRow>
                </>
              )}
              {analyzed && isDamaged && emergencyRoute.found && (
                <button
                  className="emergency-link-button"
                  onClick={() => selectAsset(emergencyRoute.pipeIds.at(-1))}
                >
                  {t("Switch to alternative route")}
                </button>
              )}
              {isAlternative && (
                <button
                  className="emergency-link-button"
                  onClick={() => selectAsset(emergencyIncident.damagedAssetId)}
                >
                  {t("Switch to damaged asset")}
                </button>
              )}
            </section>
          )}

          <section className="emergency-section">
            {!analyzed ? (
              <p className="emergency-note">{t("Run AI to generate a simulated route assessment and decision-support analysis.")}</p>
            ) : (<>
            <div className="emergency-section-title">
              <ShieldAlert size={15} />
              <h3>{t("AI emergency recommendations")}</h3>
            </div>
            <div className="emergency-data-note">
              <CircleHelp size={14} />
              {t(
                "Preliminary simulated recommendations · engineer approval required",
              )}
            </div>
            <p className="emergency-note">
              {t(
                "Assessment basis: reported burst on P-104, sample asset registry, and static network connectivity. No live telemetry, customer counts, or hydraulic model are connected.",
              )}
            </p>
            {recommendationsReady && (
              <ol className="emergency-action-list">
                {ACTIONS.map(([text, rationale, approval], index) => (
                  <li key={rationale}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <div>
                      <span>{t(text)}</span>
                      <small>
                        {t("Rationale")}: {t(rationale)}
                      </small>
                      {approval && (
                        <em>{t("Requires authorized confirmation")}</em>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {/* <div className="emergency-controls">
              <label className="emergency-status-control">
                {t("Record simulated status update")}
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{t(option)}</option>)}
                </select>
              </label>
              <button className="emergency-secondary-button" onClick={() => setCompare((value) => !value)}>
                <GitBranch size={14} />
                {t(compare ? "Hide scenario comparison" : "Compare Network Scenarios")}
              </button>
              <button className="emergency-reset-button" onClick={resetScenario}>
                <RotateCcw size={14} />
                {t("Reset Emergency Scenario")}
              </button>
            </div> */}
            </>)}
          </section>

          {/* {analyzed && <section className="emergency-section emergency-impact-section">
            <div className="emergency-section-title">
              <Activity size={15} />
              <h3>{t("Expected impact")}</h3>
            </div>
            <p className="emergency-note">
              {t(
                "Illustrative sample estimates only. These figures are manually supplied for demonstration and are not calculated from customer records, live telemetry, or a hydraulic model.",
              )}
            </p>
            {affectedZoneSupply.map(({ id, via, mode }) => (
              <InformationRow key={id} label={t(byId[id].name)}>
                {mode === "direct"
                  ? `${t("Fed directly via")} ${via}`
                  : mode === "downstream"
                    ? `${t("Fed downstream via")} ${via}`
                    : t("No alternative supply")}{" "}
                · {t("pending verification")}
              </InformationRow>
            ))}
            {[
              ["Affected customers / connections", emergencyImpact.customers],
              ["Expected service interruption", emergencyImpact.interruption],
              ["Pressure / flow change", emergencyImpact.pressureChange],
              [
                "Estimated repair / restoration time",
                emergencyImpact.restorationTime,
              ],
            ].map(([label, value]) => (
              <InformationRow key={label} label={t(label)}>
                {t(value)}
              </InformationRow>
            ))}
          </section>} */}
          <p className="emergency-disclaimer">
            {t(
              "Decision support only. No valves, flow, work orders, notifications, or repairs are executed or confirmed by this application. Proposed actions require authorized engineering and operational review.",
            )}
          </p>
        </aside>
      </main>
      <footer className="emergency-footer">
        <div>
          <span>{t("Incident")}</span>
          <b>{emergencyIncident.id}</b>
        </div>
        <div>
          <span>{t("Damaged asset")}</span>
          <b>P-104 · {t("Reported")}</b>
        </div>
        <div>
          <span>{t("Candidate route")}</span>
          <b>
            {emergencyRoute.pipeIds.join(" + ")} · {t("Unverified")}
          </b>
        </div>
        <div>
          <span>{t("Customer impact")}</span>
          <b>{t("Illustrative sample")}</b>
        </div>
        <div>
          <span>{t("Operational changes")}</span>
          <b>{t("None confirmed")}</b>
        </div>
      </footer>
    </>
  );
}