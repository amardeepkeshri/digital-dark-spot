import { useState } from "react";
import "./App.css";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const createSource = () => ({
  title: "",
  url: "",
  content: "",
});

const count = (items) => (Array.isArray(items) ? items.length : 0);

function App() {
  const [question, setQuestion] = useState("");
  const [sources, setSources] = useState([createSource(), createSource()]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState({});
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("research");
  const [completedTasks, setCompletedTasks] = useState({});

  const updateSource = (index, field, value) => {
    setSources((old) =>
      old.map((source, i) =>
        i === index ? { ...source, [field]: value } : source
      )
    );
  };

  const addSource = () => {
    if (sources.length < 6) {
      setSources((old) => [...old, createSource()]);
    }
  };

  const removeSource = (index) => {
    if (sources.length > 2) {
      setSources((old) => old.filter((_, i) => i !== index));
    }
  };

  // Fetch webpage content using the existing FastAPI endpoint.
  const extractSource = async (index) => {
    const url = sources[index].url.trim();

    if (!url) {
      setError(`Enter a URL for Source ${index + 1} first.`);
      return;
    }

    setError("");
    setExtracting((old) => ({ ...old, [index]: true }));

    try {
      const response = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to extract content from this webpage."
        );
      }

      const extracted = data.source;

      setSources((old) =>
        old.map((source, i) =>
          i === index
            ? {
                ...source,
                title: extracted.title || source.title,
                url: extracted.url || url,
                content: extracted.content || "",
              }
            : source
        )
      );
    } catch (err) {
      setError(err.message || "Website extraction failed.");
    } finally {
      setExtracting((old) => ({ ...old, [index]: false }));
    }
  };

  const analyzeInformation = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setCompletedTasks({});

    if (question.trim().length < 5) {
      setError("Please enter a research question with at least 5 characters.");
      return;
    }

    for (let i = 0; i < sources.length; i++) {
      if (
        !sources[i].title.trim() ||
        !sources[i].url.trim() ||
        sources[i].content.trim().length < 20
      ) {
        setError(
          `Complete Source ${i + 1}. Each source needs a title, URL and at least 20 characters of evidence.`
        );
        return;
      }
    }

    setLoading(true);

    const payload = {
      research_question: question.trim(),
      sources: sources.map((source, index) => ({
        source_id: `SRC00${index + 1}`,
        title: source.title.trim(),
        url: source.url.trim(),
        content: source.content.trim(),
      })),
    };

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Analysis failed. Please check your backend."
        );
      }

      setResult(data);
      setActiveNav("report");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewAnalysis = () => {
    setResult(null);
    setQuestion("");
    setSources([createSource(), createSource()]);
    setCompletedTasks({});
    setExtracting({});
    setError("");
    setActiveNav("research");
  };

  const toggleTask = (index) => {
    setCompletedTasks((old) => ({
      ...old,
      [index]: !old[index],
    }));
  };

  const priorityClass = (priority) => {
    const value = (priority || "Medium").toLowerCase();
    if (value === "high") return "priority high";
    if (value === "low") return "priority low";
    return "priority medium";
  };

  const sourceName = (sourceId) => {
    const index = Number(String(sourceId || "").replace("SRC00", "")) - 1;
    return sources[index]?.title || sourceId || "Unknown source";
  };

  const taskList = result?.verification_checklist || [];
  const completedCount = taskList.filter((_, i) => completedTasks[i]).length;
  const progress = taskList.length
    ? Math.round((completedCount / taskList.length) * 100)
    : 0;

  const PageHeading = ({ eyebrow, title, description }) => (
    <div className="page-heading">
      <span className="step-number">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );

  const SectionHeading = ({
    symbol,
    color = "green",
    title,
    description,
  }) => (
    <div className="report-section-heading">
      <div className={`section-symbol ${color}`}>{symbol}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );

  const Metric = ({ value, label }) => (
    <div className="metric-card">
      <span>{value}</span>
      <p>{label}</p>
    </div>
  );

  const EmptyState = ({ title, message }) => (
    <div className="panel empty-report">
      <div className="empty-icon">✧</div>
      <h2>{title}</h2>
      <p>{message}</p>
      <button
        className="analyze-button"
        onClick={() => setActiveNav("research")}
      >
        Go to Research Analysis →
      </button>
    </div>
  );

  const renderEvidence = () => {
    if (!result) {
      return (
        <EmptyState
          title="No evidence to review yet"
          message="Run a research analysis first. Your findings and supporting evidence will appear here."
        />
      );
    }

    return (
      <>
        <PageHeading
          eyebrow="02 / EVIDENCE"
          title="Evidence Review"
          description="Review AI-detected findings alongside their supporting source passages."
        />

        <div className="metric-grid">
          <Metric value={count(result.key_findings)} label="Key findings" />
          <Metric value={sources.length} label="Sources reviewed" />
          <Metric
            value={count(result.contradictions)}
            label="Potential conflicts"
          />
          <Metric
            value={count(result.information_gaps)}
            label="Potential gaps"
          />
        </div>

        <section className="panel report-section">
          <SectionHeading
            symbol="▤"
            title="Findings and supporting evidence"
            description="Evidence quotations are reproduced from the supplied source text."
          />

          {count(result.key_findings) === 0 ? (
            <p className="muted">No key findings were returned.</p>
          ) : (
            result.key_findings.map((finding, index) => (
              <div className="finding-item" key={index}>
                <span className="item-number">
                  FINDING {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{finding.claim}</h3>
                <div className="source-reference">
                  Sources: {(finding.source_ids || []).join(", ") || "Not specified"}
                </div>

                {(finding.evidence || []).map((evidence, i) => (
                  <blockquote className="evidence-quote" key={i}>
                    “{evidence.quote}”
                    <span>— {evidence.source_id}</span>
                  </blockquote>
                ))}
              </div>
            ))
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="↗"
            color="violet"
            title="Sources reviewed"
            description="Open the original sources to inspect their context."
          />

          {sources.map((source, index) => (
            <div className="source-register-item" key={index}>
              <div className="source-register-id">
                SRC00{index + 1}
              </div>
              <div className="source-register-info">
                <strong>{source.title || `Source ${index + 1}`}</strong>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.url}
                </a>
              </div>
              <span className="source-check">Provided</span>
            </div>
          ))}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="↔"
            color="orange"
            title="Potential contradictions"
            description="Claims that may conflict across supplied sources."
          />

          {count(result.contradictions) === 0 ? (
            <p className="muted">
              No contradictions identified. This does not prove that all
              sources agree.
            </p>
          ) : (
            result.contradictions.map((item, index) => (
              <div className="conflict-item" key={index}>
                <div className="claim-box">
                  <span>CLAIM A · {item.source_id_a}</span>
                  <p>{item.claim_a}</p>
                </div>
                <div className="claim-box">
                  <span>CLAIM B · {item.source_id_b}</span>
                  <p>{item.claim_b}</p>
                </div>
                <p className="conflict-explanation">{item.explanation}</p>
              </div>
            ))
          )}
        </section>
      </>
    );
  };

  const renderTasks = () => {
    if (!result) {
      return (
        <EmptyState
          title="No verification tasks yet"
          message="Run a research analysis first to generate a prioritized verification checklist."
        />
      );
    }

    return (
      <>
        <PageHeading
          eyebrow="03 / ACTION PLAN"
          title="Verification Tasks"
          description="Work through recommended checks and track your progress."
        />

        <section className="panel report-section">
          <div className="task-progress-header">
            <div>
              <h2>Verification progress</h2>
              <p>
                {completedCount} of {taskList.length} tasks completed
              </p>
            </div>
            <strong>{progress}%</strong>
          </div>

          <div className="task-progress-track">
            <div
              className="task-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {taskList.length === 0 ? (
            <p className="muted">No verification tasks were returned.</p>
          ) : (
            taskList.map((task, index) => (
              <div
                className={`task-item ${
                  completedTasks[index] ? "task-completed" : ""
                }`}
                key={index}
              >
                <div className="task-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="task-content">
                  <div className="item-topline">
                    <h3>{task.task}</h3>
                    <span className={priorityClass(task.priority)}>
                      {task.priority || "Medium"}
                    </span>
                  </div>
                  <p>{task.reason}</p>
                  <div className="source-reference">
                    Related sources:{" "}
                    {(task.related_source_ids || []).join(", ") ||
                      "Not specified"}
                  </div>
                  <label className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={!!completedTasks[index]}
                      onChange={() => toggleTask(index)}
                    />
                    Mark as completed
                  </label>
                </div>
              </div>
            ))
          )}
        </section>

        <p className="form-note">
          Task completion is tracked in this browser session and is not saved
          to the backend.
        </p>
      </>
    );
  };

  const renderFullReport = () => {
    if (!result) {
      return (
        <EmptyState
          title="Your full report is waiting"
          message="Submit a research question and at least two evidence sources to generate a report."
        />
      );
    }

    return (
      <>
        <div className="report-intro panel">
          <div className="report-status">
            <span className="status-dot" />
            ANALYSIS COMPLETE
          </div>
          <h2>Research intelligence report</h2>
          <p className="report-question">{result.research_question}</p>
          <div className="summary-box">{result.overall_summary}</div>
        </div>

        <div className="metric-grid">
          <Metric value={count(result.key_findings)} label="Key findings" />
          <Metric value={count(result.information_gaps)} label="Potential gaps" />
          <Metric value={count(result.contradictions)} label="Conflicts" />
          <Metric value={taskList.length} label="Verify tasks" />
        </div>

        <section className="panel report-section">
          <SectionHeading
            symbol="▤"
            title="Key findings and evidence"
            description="Claims and their supporting source quotations."
          />
          {count(result.key_findings) === 0 ? (
            <p className="muted">No key findings were returned.</p>
          ) : (
            result.key_findings.map((finding, index) => (
              <div className="finding-item" key={index}>
                <span className="item-number">
                  FINDING {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{finding.claim}</h3>
                <div className="source-reference">
                  Sources: {(finding.source_ids || []).join(", ")}
                </div>
                {(finding.evidence || []).map((evidence, i) => (
                  <blockquote className="evidence-quote" key={i}>
                    “{evidence.quote}”
                    <span>— {evidence.source_id}</span>
                  </blockquote>
                ))}
              </div>
            ))
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="✧"
            color="violet"
            title="Potential information gaps"
            description="Information not found in the supplied sources."
          />
          {count(result.information_gaps) === 0 ? (
            <p className="muted">No potential gaps identified.</p>
          ) : (
            result.information_gaps.map((gap, index) => (
              <div className="gap-item" key={index}>
                <div className="item-topline">
                  <h3>{gap.description}</h3>
                  <span className={priorityClass(gap.priority)}>
                    {gap.priority}
                  </span>
                </div>
                <p>{gap.why_it_matters}</p>
                <div className="source-reference">
                  Reviewed: {(gap.source_ids_reviewed || []).join(", ")}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="↔"
            color="orange"
            title="Contradictions"
            description="Claims that may conflict across sources."
          />
          {count(result.contradictions) === 0 ? (
            <p className="muted">No contradictions identified.</p>
          ) : (
            result.contradictions.map((item, index) => (
              <div className="conflict-item" key={index}>
                <div className="claim-box">
                  <span>CLAIM A · {item.source_id_a}</span>
                  <p>{item.claim_a}</p>
                </div>
                <div className="claim-box">
                  <span>CLAIM B · {item.source_id_b}</span>
                  <p>{item.claim_b}</p>
                </div>
                <p className="conflict-explanation">{item.explanation}</p>
              </div>
            ))
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="◷"
            color="orange"
            title="Potentially outdated sources"
            description="Date and currency signals found in the evidence."
          />
          {count(result.outdated_sources) === 0 ? (
            <p className="muted">No outdated sources identified.</p>
          ) : (
            result.outdated_sources.map((item, index) => (
              <div className="outdated-item" key={index}>
                <div className="item-topline">
                  <h3>{sourceName(item.source_id)}</h3>
                  <span className={priorityClass(item.confidence)}>
                    {item.confidence} confidence
                  </span>
                </div>
                <p>Date found: {item.date_found}</p>
                <p>{item.reason}</p>
              </div>
            ))
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="?"
            color="violet"
            title="Unanswered questions"
            description="Questions requiring additional evidence."
          />
          {count(result.unanswered_questions) === 0 ? (
            <p className="muted">No unanswered questions returned.</p>
          ) : (
            <ul className="question-list">
              {result.unanswered_questions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="✓"
            title="Verification checklist"
            description="Prioritized actions to verify important information."
          />
          {taskList.length === 0 ? (
            <p className="muted">No verification tasks returned.</p>
          ) : (
            taskList.map((task, index) => (
              <div className="task-item" key={index}>
                <div className="task-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="task-content">
                  <div className="item-topline">
                    <h3>{task.task}</h3>
                    <span className={priorityClass(task.priority)}>
                      {task.priority}
                    </span>
                  </div>
                  <p>{task.reason}</p>
                  <div className="source-reference">
                    Related sources:{" "}
                    {(task.related_source_ids || []).join(", ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel report-section">
          <SectionHeading
            symbol="!"
            color="orange"
            title="Research limitations"
            description="Important constraints of this analysis."
          />
          {count(result.limitations) === 0 ? (
            <p className="muted">No limitations were returned.</p>
          ) : (
            <ul className="question-list">
              {result.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <button className="new-analysis-button" onClick={startNewAnalysis}>
          ↻ Start a new analysis
        </button>
      </>
    );
  };

  const pageTitles = {
    research: "Research Analysis",
    evidence: "Evidence Review",
    tasks: "Verification Tasks",
    report: "Full Report",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div>
            <div className="brand-name">
              DarkSpot<span>.</span>
            </div>
            <div className="brand-caption">RESEARCH INTELLIGENCE</div>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          <button
            className={activeNav === "research" ? "nav-link selected" : "nav-link"}
            onClick={() => setActiveNav("research")}
          >
            <span className="nav-icon">⌕</span>
            Research Analysis
          </button>
          <button
            className={activeNav === "evidence" ? "nav-link selected" : "nav-link"}
            onClick={() => setActiveNav("evidence")}
          >
            <span className="nav-icon">▤</span>
            Evidence Review
          </button>
          <button
            className={activeNav === "tasks" ? "nav-link selected" : "nav-link"}
            onClick={() => setActiveNav("tasks")}
          >
            <span className="nav-icon">✓</span>
            Verification Tasks
          </button>
          <button
            className={activeNav === "report" ? "nav-link selected" : "nav-link"}
            onClick={() => setActiveNav("report")}
          >
            <span className="nav-icon">▧</span>
            Full Report
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="engine-card">
            <div className="engine-status">
              <span className="status-dot" />
              AI ENGINE
              <span className="online-label">ONLINE</span>
            </div>
            <p>Gemini-powered analysis</p>
          </div>
          <div className="sidebar-footer">
            SHINCHAN ONLINE HACKATHON 2026
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{pageTitles[activeNav]}</strong>
          </div>
          <div className="topbar-right">
            <span className="live-indicator" />
            SYSTEM ACTIVE
            <div className="avatar">DS</div>
          </div>
        </header>

        {activeNav === "research" && (
          <>
            <section className="hero">
              <div className="eyebrow">
                <span className="eyebrow-line" />
                AI-POWERED RESEARCH INTELLIGENCE
              </div>
              <h1>
                Discover what the
                <br />
                <span>information doesn't tell you.</span>
              </h1>
              <p>
                Compare multiple sources, uncover potential information gaps,
                identify conflicting claims and discover what needs verification.
              </p>
              <div className="hero-tags">
                <span>✦ Evidence-based analysis</span>
                <span>↔ Cross-source comparison</span>
                <span>✓ Verification planning</span>
              </div>
            </section>

            <section className="workspace-grid">
              <div className="panel input-panel">
                <div className="section-heading">
                  <div>
                    <span className="step-number">01 / RESEARCH</span>
                    <h2>Start your investigation</h2>
                    <p>Define a question and provide supporting evidence.</p>
                  </div>
                  <div className="heading-icon">⌕</div>
                </div>

                <form onSubmit={analyzeInformation}>
                  <label className="field-label">RESEARCH QUESTION</label>
                  <textarea
                    className="question-input"
                    placeholder="Example: What are the latest eligibility requirements for this scholarship?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                  />

                  <div className="source-heading">
                    <div>
                      <span className="step-number">02 / EVIDENCE</span>
                      <h2>Evidence sources</h2>
                      <p>Add 2–6 sources to compare.</p>
                    </div>
                    <span className="source-count">{sources.length} / 6</span>
                  </div>

                  <div className="source-list">
                    {sources.map((source, index) => (
                      <div className="source-card" key={index}>
                        <div className="source-card-heading">
                          <div>
                            <strong>
                              Source {String(index + 1).padStart(2, "0")}
                            </strong>
                            <span>SRC00{index + 1}</span>
                          </div>
                          {sources.length > 2 && (
                            <button
                              type="button"
                              className="remove-source"
                              onClick={() => removeSource(index)}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        <input
                          className="form-input"
                          type="text"
                          placeholder="Source title"
                          value={source.title}
                          onChange={(e) =>
                            updateSource(index, "title", e.target.value)
                          }
                        />

                        <input
                          className="form-input"
                          type="url"
                          placeholder="https://example.com/article"
                          value={source.url}
                          onChange={(e) =>
                            updateSource(index, "url", e.target.value)
                          }
                        />

                        <button
                          type="button"
                          className="extract-button"
                          onClick={() => extractSource(index)}
                          disabled={!!extracting[index]}
                        >
                          {extracting[index]
                            ? "Extracting webpage..."
                            : "↧ Fetch content from URL"}
                        </button>

                        <textarea
                          className="source-textarea"
                          placeholder="Extracted content will appear here. You can also paste source text manually (minimum 20 characters)..."
                          value={source.content}
                          onChange={(e) =>
                            updateSource(index, "content", e.target.value)
                          }
                        />

                        {source.content.length > 0 && (
                          <div className="content-count">
                            {source.content.length.toLocaleString()} characters
                            {source.content.length >= 20
                              ? " · Ready"
                              : " · Add more content"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {sources.length < 6 && (
                    <button
                      type="button"
                      className="add-source-button"
                      onClick={addSource}
                    >
                      + Add another source
                    </button>
                  )}

                  {error && <div className="error-message">⚠ {error}</div>}

                  <button
                    className="analyze-button"
                    type="submit"
                    disabled={loading || Object.values(extracting).some(Boolean)}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Analyzing evidence...
                      </>
                    ) : (
                      <>
                        ✦ Analyze information <span>→</span>
                      </>
                    )}
                  </button>

                  <div className="form-note">
                    ◈ Findings are potential signals, not guaranteed facts.
                  </div>
                </form>
              </div>

              <div className="right-column">
                {result ? (
                  <div className="panel report-intro">
                    <div className="report-status">
                      <span className="status-dot" />
                      ANALYSIS COMPLETE
                    </div>
                    <h2>Your analysis is ready</h2>
                    <p className="report-question">
                      {result.research_question}
                    </p>
                    <div className="summary-box">
                      {result.overall_summary}
                    </div>
                    <div className="metric-grid">
                      <Metric
                        value={count(result.key_findings)}
                        label="Findings"
                      />
                      <Metric
                        value={count(result.information_gaps)}
                        label="Potential gaps"
                      />
                    </div>
                    <button
                      className="analyze-button"
                      onClick={() => setActiveNav("report")}
                    >
                      Open full report →
                    </button>
                  </div>
                ) : (
                  <div className="empty-report panel">
                    <div className="empty-icon">✧</div>
                    <span className="step-number">
                      YOUR REPORT WILL APPEAR HERE
                    </span>
                    <h2>Your intelligence report awaits.</h2>
                    <p>
                      Submit a research question and at least two evidence
                      sources. DarkSpot will compare the supplied information.
                    </p>
                    <div className="empty-features">
                      <span>✦ Key findings</span>
                      <span>⚡ Information gaps</span>
                      <span>↔ Contradictions</span>
                      <span>✓ Verification checklist</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeNav === "evidence" && (
          <div className="page-content">{renderEvidence()}</div>
        )}
        {activeNav === "tasks" && (
          <div className="page-content">{renderTasks()}</div>
        )}
        {activeNav === "report" && (
          <div className="page-content report-column">
            {renderFullReport()}
          </div>
        )}

        <footer className="page-footer">
          <span>
            DARKSPOT © 2026 · AI-ASSISTED INFORMATION GAP DETECTION
          </span>
          <span>BUILT FOR SHINCHAN ONLINE HACKATHON 2026</span>
        </footer>
      </main>
    </div>
  );
}

export default App;