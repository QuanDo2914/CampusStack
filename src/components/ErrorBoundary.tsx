import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="recovery" role="alert">
        <h1>Something interrupted the board.</h1>
        <p>Your saved seat is still on this device. Reload to reconnect.</p>
        <button className="primary" onClick={() => window.location.reload()}>
          Reload game
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
