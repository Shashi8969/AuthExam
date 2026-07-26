import React from 'react';
import './ErrorBoundary.css';

// Without this, any uncaught error during render (a bad deploy, a missing
// env var, a genuine bug) leaves the user staring at a blank white page with
// no way to recover short of knowing to hard-refresh.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled application error:', error, info);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <h1>Something went wrong</h1>
          <p>
            AuthExam ran into an unexpected error. Please try again, and
            contact support if the problem continues.
          </p>
          <button onClick={this.handleReload} className="error-boundary-button">
            Go to Homepage
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
