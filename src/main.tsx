import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import App from './App.tsx';
import './index.css';

// Initialize security systems
import { applySecurityHeaders, initCSPReporting } from './lib/security/csp';
import { performSecurityAudit } from './lib/security/environment';

// Using system fonts for now

// Apply security headers and initialize CSP reporting
applySecurityHeaders();
initCSPReporting();

// Run initial security audit in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    const audit = performSecurityAudit();
    console.log('Security Audit:', audit);
    
    if (audit.overall === 'insecure') {
      console.warn('Security issues detected:', audit.checks.filter(c => c.status === 'fail'));
    }
  }, 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
