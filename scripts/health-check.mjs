// Health Check Script with Proper Timeout Handling

const abortController = new AbortController();
const timeout = 5000; // Timeout set to 5 seconds

async function healthCheck() {
    const signal = abortController.signal;

    // Set a timeout to abort the request
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
        const response = await fetch('https://example.com/health', { signal });
        if (!response.ok) {
            throw new Error('Health check failed with status: ' + response.status);
        }
        const data = await response.json();
        console.log('Health check passed:', data);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Health check timed out.');
        } else {
            console.error('Health check error:', error);
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

healthCheck();
