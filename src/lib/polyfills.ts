/**
 * Browser polyfills for Node.js modules and missing APIs
 */
import { Buffer } from 'buffer';

// Make Buffer available globally with more aggressive polyfilling
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
}

// Ensure process.env exists for compatibility
if (typeof globalThis !== 'undefined' && !(globalThis as any).process) {
  (globalThis as any).process = { env: {} };
}

if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: {} };
}

/**
 * Polyfill for AbortSignal.any()
 * 
 * AbortSignal.any() creates an AbortSignal that will be aborted when any of the
 * provided signals are aborted. This is useful for combining multiple abort signals.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
 */

// Check if AbortSignal.any is already available
if (!AbortSignal.any) {
  AbortSignal.any = function(signals: AbortSignal[]): AbortSignal {
    // If no signals provided, return a signal that never aborts
    if (signals.length === 0) {
      return new AbortController().signal;
    }

    // If only one signal, return it directly for efficiency
    if (signals.length === 1) {
      return signals[0];
    }

    // Check if any signal is already aborted
    for (const signal of signals) {
      if (signal.aborted) {
        // Create an already-aborted signal with the same reason
        const controller = new AbortController();
        controller.abort(signal.reason);
        return controller.signal;
      }
    }

    // Create a new controller for the combined signal
    const controller = new AbortController();

    // Function to abort the combined signal
    const onAbort = (event: Event) => {
      const target = event.target as AbortSignal;
      controller.abort(target.reason);
    };

    // Listen for abort events on all input signals
    for (const signal of signals) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Clean up listeners when the combined signal is aborted
    controller.signal.addEventListener('abort', () => {
      for (const signal of signals) {
        signal.removeEventListener('abort', onAbort);
      }
    }, { once: true });

    return controller.signal;
  };
}

/**
 * Polyfill for AbortSignal.timeout()
 * 
 * AbortSignal.timeout() creates an AbortSignal that will be aborted after a
 * specified number of milliseconds.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
 */

// Check if AbortSignal.timeout is already available
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function(milliseconds: number): AbortSignal {
    const controller = new AbortController();
    
    setTimeout(() => {
      controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    }, milliseconds);
    
    return controller.signal;
  };
}