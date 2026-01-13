const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in newer node
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMGFlMmJjOC1mMjhkLTQxMGYtYTc1ZC1jMjYwZjk3YjAxZmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1MzY3NzI4fQ.8k-rOtIgW1WGHcztBVx2p_CgvFqvB0qXNmM5g29i650';
const BASE_URL = 'https://automat.owona.de/api/v1';
const WORKFLOW_ID = 'gwd3P1NQMXjuWzQM';

async function getWorkflow() {
    try {
        const response = await fetch(`${BASE_URL}/workflows/${WORKFLOW_ID}`, {
            headers: {
                'X-N8N-API-KEY': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch workflow: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));

        // Save to file for analysis
        fs.writeFileSync('n8n_workflow.json', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

getWorkflow();
