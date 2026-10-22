import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { api, AuthUser, getCurrentUser, login, logout } from './api/client';

type Location = { id: number; name: string };
type Inspector = { id: number; name: string; email: string };
type Inspection = {
  id: number;
  status: 'Yet to Start' | 'Completed';
  createdAt: string;
  location: Location | null;
  assignedInspector: Inspector | null;
  startedAt: string | null;
  durationMinutes: number | null;
  passed: boolean | null;
  comments: string | null;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

function currentLocalDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('manager@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { onLogin(await login(email, password)); } catch (err) { setError('Login failed'); }
  }
  return <div className="container py-5" style={{ maxWidth: 480 }}>
    <h1 className="h3 mb-3">Assessment Starter</h1>
    <form onSubmit={submit} className="card card-body">
      {error && <div className="alert alert-danger">{error}</div>}
      <label className="form-label">Email</label>
      <input className="form-control mb-2" value={email} onChange={e => setEmail(e.target.value)} />
      <label className="form-label">Password</label>
      <input className="form-control mb-3" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="btn btn-primary">Login</button>
      <p className="text-muted small mt-3 mb-0">Try manager@example.com or inspector@example.com. Password: password.</p>
    </form>
  </div>;
}

function CreateInspectionModal({
  inspectors,
  onCancel,
  onCreated,
}: {
  inspectors: Inspector[];
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [selectedInspector, setSelectedInspector] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onCancel();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel, saving]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/inspections', {
        method: 'POST',
        body: JSON.stringify({ inspectorId: Number(selectedInspector) }),
      });
      await onCreated();
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="create-inspection-title">
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
        <form className="modal-content" onSubmit={create}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title h4" id="create-inspection-title">Create inspection</h2>
              <p className="text-muted mb-0 mt-1">Choose an Inspector to assign this inspection.</p>
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onCancel} disabled={saving} />
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {inspectors.length === 0
              ? <div className="alert alert-warning mb-0">No Inspectors are available to assign.</div>
              : <fieldset>
                <legend className="h6 mb-3">Available Inspectors <span className="text-muted fw-normal">({inspectors.length})</span></legend>
                <div className="list-group overflow-y-auto pe-2" style={{ maxHeight: '50vh' }}>
                  {inspectors.map(inspector => {
                    const selected = selectedInspector === inspector.id.toString();
                    return <label
                      key={inspector.id}
                      className={`list-group-item list-group-item-action d-flex align-items-center gap-3 p-3 ${selected ? 'border-primary bg-primary-subtle' : ''}`}
                      htmlFor={`new-inspection-inspector-${inspector.id}`}
                    >
                      <input
                        id={`new-inspection-inspector-${inspector.id}`}
                        className="form-check-input flex-shrink-0 m-0"
                        type="radio"
                        name="new-inspection-inspector"
                        value={inspector.id}
                        checked={selected}
                        onChange={e => setSelectedInspector(e.target.value)}
                        required
                      />
                      <span className="d-flex flex-column">
                        <span className="fw-semibold">{inspector.name}</span>
                        <span className="small text-muted">{inspector.email}</span>
                      </span>
                    </label>;
                  })}
                </div>
              </fieldset>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            {inspectors.length > 0 && <button className="btn btn-primary" disabled={saving || !selectedInspector}>
              {saving ? 'Creating...' : 'Create inspection'}
            </button>}
          </div>
        </form>
      </div>
    </div>
    <div className="modal-backdrop fade show" />
  </>;
}

function InspectionCard({
  inspection,
  user,
  locations,
  inspectors,
  onUpdated,
  onError,
}: {
  inspection: Inspection;
  user: AuthUser;
  locations: Location[];
  inspectors: Inspector[];
  onUpdated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [selectedInspector, setSelectedInspector] = useState(
    inspection.assignedInspector?.id.toString() ?? '',
  );
  const [locationId, setLocationId] = useState('');
  const [startedAt, setStartedAt] = useState(currentLocalDateTime);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [passed, setPassed] = useState('true');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const isManager = user.role === 'Manager';

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInspector) {
      onError('Choose an Inspector before assigning this inspection.');
      return;
    }
    setSaving(true);
    try {
      await api(`/inspections/${inspection.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ inspectorId: Number(selectedInspector) }),
      });
      onError('');
      await onUpdated();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/inspections/${inspection.id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({
          locationId: Number(locationId),
          startedAt: new Date(startedAt).toISOString(),
          durationMinutes: Number(durationMinutes),
          passed: passed === 'true',
          comments,
        }),
      });
      onError('');
      await onUpdated();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return <article className="card mb-3">
    <div className="card-body">
      <div className="d-flex flex-wrap justify-content-between gap-2">
        <div>
          <h2 className="h5 mb-1">Inspection #{inspection.id}</h2>
          <span className={`badge ${inspection.status === 'Completed' ? 'text-bg-success' : 'text-bg-secondary'}`}>
            {inspection.status}
          </span>
        </div>
        <div className="text-muted small">Created {new Date(inspection.createdAt).toLocaleString()}</div>
      </div>

      {isManager && <div className="mt-3">
        <div className="mb-2">Assigned Inspector: {inspection.assignedInspector?.name ?? 'Not assigned'}</div>
        {inspection.status === 'Yet to Start' && <form className="d-flex gap-2" onSubmit={assign}>
          <select
            className="form-select"
            aria-label={`Assign Inspector to inspection ${inspection.id}`}
            value={selectedInspector}
            onChange={e => setSelectedInspector(e.target.value)}
            required
          >
            <option value="">Choose an Inspector</option>
            {inspectors.map(inspector => <option key={inspector.id} value={inspector.id}>
              {inspector.name} ({inspector.email})
            </option>)}
          </select>
          <button className="btn btn-outline-primary text-nowrap" disabled={saving}>Assign</button>
        </form>}
      </div>}

      {inspection.status === 'Completed' && <div className="mt-3">
        <div><strong>Location:</strong> {inspection.location?.name}</div>
        <div><strong>Started:</strong> {inspection.startedAt ? new Date(inspection.startedAt).toLocaleString() : ''}</div>
        <div><strong>Duration:</strong> {inspection.durationMinutes} minutes</div>
        <div><strong>Result:</strong> {inspection.passed ? 'Pass' : 'Fail'}</div>
        {inspection.comments && <div><strong>Comments:</strong> {inspection.comments}</div>}
      </div>}

      {!isManager && inspection.status === 'Yet to Start' && <form className="row g-3 mt-1" onSubmit={complete}>
        <div className="col-md-6">
          <label className="form-label" htmlFor={`location-${inspection.id}`}>Location</label>
          <select id={`location-${inspection.id}`} className="form-select" value={locationId}
            onChange={e => setLocationId(e.target.value)} required>
            <option value="">Choose a location</option>
            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor={`started-${inspection.id}`}>Start date and time</label>
          <input id={`started-${inspection.id}`} className="form-control" type="datetime-local"
            value={startedAt} onChange={e => setStartedAt(e.target.value)} required />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor={`duration-${inspection.id}`}>Duration (minutes)</label>
          <input id={`duration-${inspection.id}`} className="form-control" type="number" min="1"
            value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} required />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor={`result-${inspection.id}`}>Result</label>
          <select id={`result-${inspection.id}`} className="form-select" value={passed}
            onChange={e => setPassed(e.target.value)}>
            <option value="true">Pass</option>
            <option value="false">Fail</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor={`comments-${inspection.id}`}>Comments</label>
          <input id={`comments-${inspection.id}`} className="form-control" maxLength={2000}
            value={comments} onChange={e => setComments(e.target.value)} />
        </div>
        <div className="col-12">
          <button className="btn btn-primary" disabled={saving}>Complete inspection</button>
        </div>
      </form>}
    </div>
  </article>;
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [locations, setLocations] = useState<Location[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    try {
      const [nextInspections, nextLocations] = await Promise.all([
        api<Inspection[]>('/inspections'),
        api<Location[]>('/locations'),
      ]);
      setInspections(nextInspections);
      setLocations(nextLocations);
      if (user.role === 'Manager') {
        setInspectors(await api<Inspector[]>('/users/inspectors'));
      }
      setError('');
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;
  return <div className="container py-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div><h1 className="h3 mb-0">Safety Inspections</h1><div className="text-muted">Logged in as {user.name} ({user.role})</div></div>
      <button className="btn btn-outline-secondary" onClick={() => { logout(); setUser(null); }}>Logout</button>
    </div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    <div className="d-flex gap-2 mb-3">
      {user.role === 'Manager' && <button className="btn btn-primary" disabled={loading} onClick={() => setShowCreateModal(true)}>
        Create inspection
      </button>}
      <button className="btn btn-outline-secondary" disabled={loading} onClick={() => void refresh()}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
    {inspections.length === 0 && !loading
      ? <div className="alert alert-light border">No inspections {user.role === 'Inspector' ? 'are assigned to you' : 'have been created'}.</div>
      : inspections.map(inspection => <InspectionCard key={inspection.id} inspection={inspection} user={user}
        locations={locations} inspectors={inspectors} onUpdated={refresh} onError={setError} />)}
    {showCreateModal && <CreateInspectionModal
      inspectors={inspectors}
      onCancel={() => setShowCreateModal(false)}
      onCreated={async () => {
        setShowCreateModal(false);
        await refresh();
      }}
    />}
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
