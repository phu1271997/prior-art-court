import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Fallback wrapper for the whole app.
 *
 * A runtime error in a section component used to blow up the whole tree
 * and render a blank white screen — the exact state where the user cannot
 * even read a diagnostic. This boundary catches the throw, shows a plain
 * panel with the message and a reload button, and prints the full stack
 * to the console so the developer can still see it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Prior Art Court crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary">
        <div className="error-boundary-card">
          <span className="section-eyebrow">The court could not render</span>
          <h1>Something in the frontend threw.</h1>
          <p>
            The contract on studionet is unaffected: this is a rendering
            error, not a chain error. Refresh to try again. If the panel
            keeps coming back, open an issue on GitHub with the message
            below so we can pin the cause.
          </p>
          <pre className="error-boundary-message">
            {this.state.error.name}: {this.state.error.message}
          </pre>
          <div className="error-boundary-actions">
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <a
              href="https://github.com/phu1271997/prior-art-court/issues"
              target="_blank"
              rel="noreferrer"
              className="hero-secondary"
            >
              Report the crash
            </a>
          </div>
        </div>
      </div>
    );
  }
}
