import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { submitBugReport } from '../firebase/bugReports';

// Floating feedback/bug-report button, mounted once at the root of the app
// (see App.tsx) so it's visible on every screen — login, character
// creation, and the full game — rather than being buried inside a specific
// section. Deliberately create-only/fire-and-forget on the backend side
// (see firestore.rules's bugReports match): there's no in-app way to view
// past reports, just the Firebase console.
export function BugReportButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function handleClose() {
    setOpen(false);
    setStatus('idle');
    setMessage('');
    setEmail('');
  }

  async function handleSubmit() {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;
    setStatus('sending');
    try {
      await submitBugReport({
        uid: user?.uid ?? null,
        email: email.trim() || null,
        message: trimmed,
        page: window.location.hash || window.location.pathname,
      });
      setStatus('sent');
      setMessage('');
      setEmail('');
      setTimeout(handleClose, 1800);
    } catch (err) {
      console.error('Bug report submission failed:', err);
      setStatus('error');
    }
  }

  return (
    <>
      <button type="button" className="bug-report-fab" onClick={() => setOpen(true)} title="Report a bug or send feedback">
        🐞 Report Bug
      </button>

      {open && (
        <div className="bug-report-backdrop" onClick={handleClose}>
          <div className="bug-report-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Report a Bug</h3>
            {status === 'sent' ? (
              <p className="bug-report-thanks">Thanks! Your report has been sent.</p>
            ) : (
              <>
                <p>Found a bug, or have feedback? Let us know below.</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What happened? What did you expect instead?"
                  rows={5}
                  maxLength={2000}
                  disabled={status === 'sending'}
                />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional, if you want a reply)"
                  maxLength={254}
                  disabled={status === 'sending'}
                />
                {status === 'error' && <p className="error">Something went wrong. Please try again.</p>}
                <div className="bug-report-actions">
                  <button type="button" onClick={handleClose} disabled={status === 'sending'}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={status === 'sending' || message.trim().length === 0}>
                    {status === 'sending' ? 'Sending…' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
