import { Component, type ErrorInfo, type ReactNode } from 'react';
import { submitBugReport } from '../firebase/bugReports';

// A render error anywhere below this boundary used to take down the whole
// app — React unmounts the entire tree on an uncaught error, leaving a
// blank white page with no message and no recovery besides guessing to
// reload. Scoped around CharacterProvider/AppContent only (see App.tsx), so
// BugReportButton/NotificationToasts — siblings, not children — stay
// mounted and usable even when this fires.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
    // Best-effort automatic crash report — an alpha tester is unlikely to
    // think to click "Report Bug" themselves after the screen goes blank,
    // so this is the only way most crashes would ever surface.
    submitBugReport({
      uid: null,
      message: `Uncaught render error: ${error.message}\n${(info.componentStack ?? '').slice(0, 1500)}`,
      page: window.location.href,
    }).catch((reportErr) => console.error('Automatic crash report failed:', reportErr));
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary-screen">
          <h2>Something went wrong</h2>
          <p>
            A crash report was sent automatically. Reloading usually fixes it — your progress up to your last
            action is already saved.
          </p>
          <button onClick={this.handleReload}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
