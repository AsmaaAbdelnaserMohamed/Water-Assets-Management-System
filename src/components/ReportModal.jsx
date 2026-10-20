import { useEffect, useState } from "react";
import { ArrowDownToLine, FileText, Printer, Upload, X } from "lucide-react";
import { byId, computePlan } from "../data/network";
import { useT } from "../i18n";

const reportDate = (lang) =>
  new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

export default function ReportModal({ budget, lang, onClose }) {
  const { t } = useT();
  const [tab, setTab] = useState("report");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const plan = computePlan(budget);
  const priorities = plan.ids.slice(0, 8).map((id, index) => ({
    ...byId[id],
    rank: index + 1,
  }));
  const riskReduction = plan.avgBefore
    ? Math.round(((plan.avgBefore - plan.avgAfter) / plan.avgBefore) * 100)
    : 0;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handlePdf = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setUploadError(t("Please select a PDF file."));
      return;
    }
    setUploadError("");
    setPdfName(file.name);
    setPdfUrl(URL.createObjectURL(file));
  };

  const exportPdf = () => {
    setTab("report");
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <div
      className="report-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <header className="report-toolbar">
          <div className="report-heading">
            <span className="report-icon">
              <FileText size={19} />
            </span>
            <div>
              <h2 id="report-title">{t("Decision report")}</h2>
              <p>{t("Executive briefing · Water infrastructure")}</p>
            </div>
          </div>
          <div className="report-actions">
            <button className="report-button report-export" onClick={exportPdf}>
              <Printer size={16} />
              {t("Export PDF")}
            </button>
            <button
              className="report-close"
              onClick={onClose}
              aria-label={t("Close")}
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <nav className="report-tabs" aria-label={t("Report tools")}>
          <button
            className={tab === "report" ? "active" : ""}
            onClick={() => setTab("report")}
          >
            <FileText size={15} />
            {t("Executive report")}
          </button>
          {/* <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}><Upload size={15}/>{t('Upload PDF')}</button> */}
        </nav>

        {tab === "report" ? (
          <div className="report-scroll">
            <article className="report-document">
              <div className="report-cover">
                <div className="cover-brand">
                  <span className="cover-mark">W</span>
                  <span>
                    EDGE-PRO<small>{t("WATER NETWORK DIGITAL TWIN")}</small>
                  </span>
                </div>
                <div className="cover-rule" />
                <p className="cover-kicker">{t("STRATEGIC ASSET RENEWAL")}</p>
                <h1>
                  {t("Water network")}
                  <br />
                  <strong>{t("Decision brief")}</strong>
                </h1>
                <p className="cover-summary">
                  {t(
                    "A budget-led renewal recommendation to reduce infrastructure risk and direct investment to the highest-priority assets.",
                  )}
                </p>
                <div className="cover-meta">
                  <span>{t("Prepared for decision makers")}</span>
                  <b>{reportDate(lang)}</b>
                </div>
              </div>

              <section className="report-section">
                <div className="section-eyebrow">
                  {t("01 · EXECUTIVE SUMMARY")}
                </div>
                <h2>{t("A focused investment can lower network exposure")}</h2>
                <p className="report-lead">
                  {t(
                    "The AI analyzed the simulated water network, ranked renewal candidates against the selected budget, and estimated the expected change in network risk. Validate costs and field conditions before commitment.",
                  )}
                </p>
                <div className="report-kpis">
                  <div>
                    <span>{t("Selected budget")}</span>
                    <strong>{budget}</strong>
                    <small>{t("M EGP")}</small>
                  </div>
                  <div>
                    <span>{t("Investment proposed")}</span>
                    <strong>
                      {plan.spent.toLocaleString(
                        lang === "ar" ? "ar-EG" : "en-US",
                        { maximumFractionDigits: 1 },
                      )}
                    </strong>
                    <small>{t("M EGP")}</small>
                  </div>
                  <div>
                    <span>{t("Avg network risk")}</span>
                    <strong>
                      {plan.avgBefore}% <i>→</i> {plan.avgAfter}%
                    </strong>
                    <small>{t("Before → after")}</small>
                  </div>
                  <div>
                    <span>{t("Risk reduction")}</span>
                    <strong>{riskReduction}%</strong>
                    <small>{t("Modelled reduction")}</small>
                  </div>
                </div>
                <p className="report-lead">
                  {t(
                    "AI-estimated budget to cover all eligible renewal candidates",
                  )}
                  :{" "}
                  <b>
                    {plan.fullCoverageBudget.toLocaleString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { maximumFractionDigits: 1 },
                    )}{" "}
                    {t("M EGP")}
                  </b>{" "}
                  ({plan.eligibleCount}{" "}
                  {t("candidates with risk scores of 40% or higher")}).
                </p>
              </section>

              <section className="report-section">
                <div className="section-eyebrow">
                  {t("02 · RECOMMENDED PORTFOLIO")}
                </div>
                <div className="report-section-title">
                  <div>
                    <h2>{t("Ranked renewal priorities")}</h2>
                    <p>
                      {t(
                        "Highest-risk eligible assets within the selected budget.",
                      )}
                    </p>
                  </div>
                  <span className="portfolio-count">
                    {plan.ids.length} {t("interventions")}
                  </span>
                </div>
                {priorities.length ? (
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t("Asset")}</th>
                          <th>{t("Type")}</th>
                          <th>{t("Risk")}</th>
                          <th>{t("Est. cost")}</th>
                          <th>{t("After renewal")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priorities.map((asset) => (
                          <tr key={asset.id}>
                            <td>
                              <span className="rank-badge">
                                {asset.rank.toString().padStart(2, "0")}
                              </span>
                            </td>
                            <td>
                              <b>{t(asset.name)}</b>
                              <small>{asset.id}</small>
                            </td>
                            <td>
                              {t(
                                asset.type === "pipe"
                                  ? "Pipeline"
                                  : asset.type === "zone"
                                    ? "Zone"
                                    : "Asset",
                              )}
                            </td>
                            <td>
                              <span className="risk-value">{asset.risk}%</span>
                            </td>
                            <td>
                              {asset.cost} {t("M EGP")}
                            </td>
                            <td>
                              <span className="after-value">
                                {t("Renewed")} · 8%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="report-empty">
                    {t(
                      "No assets qualify for renewal at this budget. Increase the budget to review eligible priorities.",
                    )}
                  </div>
                )}
                {plan.ids.length > priorities.length && (
                  <p className="table-note">
                    {t("Showing first 8 of")} {plan.ids.length}{" "}
                    {t("recommended interventions.")}
                  </p>
                )}
              </section>

              <section className="report-section report-outcome">
                <div className="section-eyebrow">
                  {t("03 · DECISION & DELIVERY")}
                </div>
                <h2>{t("Recommended decision")}</h2>
                <div className="decision-card">
                  <span className="decision-priority">
                    {t("DECISION REQUIRED")}
                  </span>
                  <p>
                    {plan.ids.length
                      ? t(
                          "The AI analysis recommends approving the selected renewal portfolio in priority order, subject to field validation and procurement review.",
                        )
                      : t(
                          "Review the budget or asset eligibility criteria before approving a renewal portfolio.",
                        )}
                  </p>
                  <div className="decision-checks">
                    <span>
                      <b>01</b>
                      {t(
                        "Validate asset condition and estimate with field teams.",
                      )}
                    </span>
                    <span>
                      <b>02</b>
                      {t(
                        "Confirm funding availability and procurement lead times.",
                      )}
                    </span>
                    <span>
                      <b>03</b>
                      {t("Track post-renewal risk against this baseline.")}
                    </span>
                  </div>
                </div>
                <div className="report-footnote">
                  <b>{t("Method & limitations")}</b>
                  <p>
                    {t(
                      "Priority ranking uses the application risk score and estimated asset cost. Values are simulated for demonstration and are not a substitute for engineering inspection, validated operational data, or a formal investment appraisal.",
                    )}
                  </p>
                </div>
              </section>
              <footer className="report-footer">
                <span>EDGE-PRO · {t("WATER NETWORK DIGITAL TWIN")}</span>
                <span>{t("CONFIDENTIAL · DECISION SUPPORT")}</span>
              </footer>
            </article>
          </div>
        ) : (
          <div className="upload-panel">
            {!pdfUrl ? (
              <label className="upload-drop">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdf}
                />
                <span className="upload-symbol">
                  <Upload size={22} />
                </span>
                <strong>{t("Upload a decision document")}</strong>
                <span>
                  {t(
                    "Choose a PDF to preview it here. The file stays on this device.",
                  )}
                </span>
                <em>{t("PDF files only")}</em>
              </label>
            ) : (
              <div className="uploaded-file">
                <div className="uploaded-heading">
                  <span>
                    <FileText size={17} />
                    <b>{pdfName}</b>
                  </span>
                  <label className="report-button">
                    <Upload size={15} />
                    {t("Replace PDF")}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdf}
                    />
                  </label>
                </div>
                <iframe title={t("Uploaded PDF preview")} src={pdfUrl} />
              </div>
            )}
            {uploadError && (
              <p className="upload-error" role="alert">
                {uploadError}
              </p>
            )}
            <p className="upload-privacy">
              <ArrowDownToLine size={14} />
              {t(
                "Your document is previewed locally and is not sent to a server.",
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
