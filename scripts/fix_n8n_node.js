const https = require('https');
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMGFlMmJjOC1mMjhkLTQxMGYtYTc1ZC1jMjYwZjk3YjAxZmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1MzY3NzI4fQ.8k-rOtIgW1WGHcztBVx2p_CgvFqvB0qXNmM5g29i650';
const HOST = 'automat.owona.de';
const WORKFLOW_ID = 'gwd3P1NQMXjuWzQM';

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            path: '/api/v1' + path,
            method: method,
            headers: {
                'X-N8N-API-KEY': API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse JSON'));
                    }
                } else {
                    console.error(`Request failed. Status: ${res.statusCode}, Data: ${data}`);
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function fixWorkflow() {
    try {
        // 1. Fetch latest workflow definition
        console.log('Fetching workflow...');
        const workflow = await request(`/workflows/${WORKFLOW_ID}`, 'GET');

        // 2. Find node "Prepare Telegram Notification"
        const node = workflow.nodes.find(n => n.name === 'Prepare Telegram Notification');
        if (!node) {
            throw new Error('Node "Prepare Telegram Notification" not found');
        }

        console.log('Found node "Prepare Telegram Notification". Checking code...');
        const originalCode = node.parameters.jsCode;

        // Check if bug is present
        if (originalCode.includes('const json = $input.json || {};')) {
            console.log('Bug detected: $input.json used.');

            // 3. Patch code
            const newCode = originalCode.replace(
                'const json = $input.json || {};',
                'const json = $input.first().json || {};'
            );
            node.parameters.jsCode = newCode;
            console.log('Patched code to use $input.first().json');

            // 4. Upload updated workflow
            console.log('Uploading updated workflow...');

            // Clean payload: keep only updateable fields
            const payload = {
                name: workflow.name,
                nodes: workflow.nodes,
                connections: workflow.connections,
                settings: workflow.settings
            };

            await request(`/workflows/${WORKFLOW_ID}`, 'PUT', payload);
            console.log('Workflow updated successfully!');

        } else {
            console.log('Code does not match expected buggy pattern. Already fixed?');
            console.log('Current Code snippet:', originalCode.substring(0, 100));
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixWorkflow();
