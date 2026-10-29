const FILES_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

const STATUS_STEPS = [
  { key: 'building_query', label: 'Building PubMed query' },
  { key: 'fetching_papers', label: 'Fetching papers from PubMed' },
  { key: 'synthesizing', label: 'Synthesizing safety protocol' },
  { key: 'building_ppt', label: 'Building presentation' },
  { key: 'completed', label: 'Completed' },
];

function statusIndex(status) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? (status === 'pending' ? -1 : 0) : idx;
}

function ResearchResult({ request }) {
  if (!request) {
    return (
      <div className="research-empty">
        <h2>PubMed Research</h2>
        <p>Pick a disease and filters, then run research to generate a cited safety-protocol deck.</p>
      </div>
    );
  }

  const { status } = request;
  const isFailed = status === 'failed';
  const isDone = status === 'completed';
  const currentIdx = statusIndex(status);
  const papers = request.papers || [];

  return (
    <div className="research-result">
      <div className="research-result-header">
        <h2>
          {request.disease_name || 'Research'}
          {request.strain_name ? ` — ${request.strain_name}` : ''}
        </h2>
        <span className={`status-badge ${isDone ? 'completed' : isFailed ? 'failed' : 'processing'}`}>
          {status}
        </span>
      </div>

      {/* Progress steps */}
      {!isFailed && (
        <div className="research-steps">
          {STATUS_STEPS.map((step, i) => {
            const state = isDone
              ? 'done'
              : i < currentIdx
              ? 'done'
              : i === currentIdx
              ? 'active'
              : 'pending';
            return (
              <div key={step.key} className={`research-step ${state}`}>
                <span className="step-dot">{state === 'done' ? '✓' : i + 1}</span>
                <span className="step-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {isFailed && (
        <div className="research-error">
          <strong>Failed:</strong> {request.error_message || 'Unknown error'}
        </div>
      )}

      {isDone && request.ppt_path && (
        <div className="research-download">
          <a
            className="research-download-btn"
            href={`${FILES_BASE}/files/${request.ppt_path}`}
            target="_blank"
            rel="noreferrer"
          >
            ⬇ Download Safety Protocol PPT
          </a>
        </div>
      )}

      {request.pubmed_query && (
        <div className="research-query">
          <span className="research-query-label">PubMed query</span>
          <code>{request.pubmed_query}</code>
        </div>
      )}

      {papers.length > 0 && (
        <div className="research-papers">
          <h3>Cited papers ({papers.length})</h3>
          <ul>
            {papers.map((p) => (
              <li key={p.id || p.pmid}>
                <a href={p.url} target="_blank" rel="noreferrer" className="paper-title">
                  {p.title}
                </a>
                <div className="paper-meta">
                  {[p.authors, p.journal, p.pub_year].filter(Boolean).join(' · ')}
                  {p.pmid ? ` · PMID: ${p.pmid}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ResearchResult;
