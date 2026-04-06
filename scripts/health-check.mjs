'use strict';

import fetch from 'node-fetch';

const TIMEOUT = 5000; // fetch timeout in milliseconds

const fetchWithTimeout = async (url) => {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), TIMEOUT))
    ]);
};

const healthCheck = async () => {
    try {
        const response = await fetchWithTimeout('http://example.com/health');
        if (!response.ok) {
            console.error(`Error: ${response.status} - ${response.statusText}`);
        } else {
            const data = await response.json();
            console.log('Health Check Response:', data);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
};

healthCheck();