import { Component, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error) {
        console.error('[Views] Uncaught error:', error);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: '0.75rem', color: 'var(--color-red)', fontSize: '0.8rem' }}>
                    <strong>Something went wrong.</strong>
                    <br />
                    Please click the Reload button below.
                    {/* Closing and reopening the popover cannot recover this: OBR hides the
                        iframe rather than destroying it, so the broken tree stays mounted.
                        Reloading the frame is the only in-extension recovery. */}
                    <button
                        onClick={() => window.location.reload()}
                        style={{ width: 'fit-content', margin: '0.5rem 0' }}
                    >
                        Reload
                    </button>
                    <span style={{ color: 'var(--color-overlay1)', fontFamily: 'monospace' }}>
                        {this.state.error.message}
                    </span>
                </div>
            );
        }
        return this.props.children;
    }
}
