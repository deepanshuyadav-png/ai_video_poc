import { useState, useMemo } from 'react';

function ResearchForm({ catalog, onSubmit, running }) {
  const diseases = catalog?.diseases || [];
  const filters = catalog?.filters || {};

  const [diseaseId, setDiseaseId] = useState('');
  const [strainId, setStrainId] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});

  const selectedDisease = useMemo(
    () => diseases.find((d) => String(d.id) === String(diseaseId)),
    [diseases, diseaseId]
  );

  const strains = selectedDisease?.strains?.filter((s) => s.is_active) || [];

  const handleDiseaseChange = (value) => {
    setDiseaseId(value);
    setStrainId(''); // reset strain when disease changes
  };

  const handleFilterChange = (group, value) => {
    setSelectedFilters((prev) => ({ ...prev, [group]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!diseaseId) return;
    onSubmit({
      diseaseId: Number(diseaseId),
      strainId: strainId ? Number(strainId) : undefined,
      filters: selectedFilters,
    });
  };

  return (
    <form className="research-form" onSubmit={handleSubmit}>
      <div className="research-field">
        <label>Disease *</label>
        <select value={diseaseId} onChange={(e) => handleDiseaseChange(e.target.value)} required>
          <option value="">Select a disease</option>
          {diseases.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {strains.length > 0 && (
        <div className="research-field">
          <label>Strain</label>
          <select value={strainId} onChange={(e) => setStrainId(e.target.value)}>
            <option value="">Any strain</option>
            {strains.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {Object.entries(filters).map(([group, opts]) => (
        <div className="research-field" key={group}>
          <label className="filter-group-label">{group}</label>
          <select
            value={selectedFilters[group] || ''}
            onChange={(e) => handleFilterChange(group, e.target.value)}
          >
            <option value="">Any</option>
            {opts.map((o) => (
              <option key={o.id} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}

      <button type="submit" className="research-run-btn" disabled={running || !diseaseId}>
        {running ? 'Running…' : 'Run Research'}
      </button>
    </form>
  );
}

export default ResearchForm;
