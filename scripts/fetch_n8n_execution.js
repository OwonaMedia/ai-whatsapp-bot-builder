const https = require('https');
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMGFlMmJjOC1mMjhkLTQxMGYtYTc1ZC1jMjYwZjk3YjAxZmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1MzY3NzI4fQ.8k-rOtIgW1WGHcztBVx2p_CgvFqvB0qXNmM5g29i650';
const HOST = 'automat.owona.de';
const WORKFLOW_ID = 'gwd3P1NQMXjuWzQM';

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            path: '/api/v1' + path,
            method: 'GET',
            headers: {
                'X-N8N-API-KEY': API_KEY,
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
                    reject(new Error(`Status Code: ${res.statusCode}, Body: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function debugExecution() {
    try {
        console.log('Fetching executions...');
        const executions = await request(`/executions?workflowId=${WORKFLOW_ID}&limit=1&status=running`);
        // Note: status=running might be empty if it finished. checking all statuses.
        // Actually, asking for all statuses sorted by id desc.
        const allExecutions = await request(`/executions?workflowId=${WORKFLOW_ID}&limit=1`);

        if (allExecutions.data.length === 0) {
            console.log('No executions found.');
            return;
        }

        const lastExecution = allExecutions.data[0];
        console.log(`Analyzing Execution ID: ${lastExecution.id} (Status: ${lastExecution.status})`);

        const fullExecution = await request(`/executions/${lastExecution.id}?includeData=true`);

        // Save to file for detailed inspection
        fs.writeFileSync('last_execution.json', JSON.stringify(fullExecution, null, 2));
        console.log('Saved execution details to last_execution.json');

        // Analyze specific nodes
        const nodesOfInterest = [
            'Create E-Book Proposals',
            'Generate ISBN',
            'Merge Proposal with Chat Data',
            'Ensure Proposal Data for Telegram',
            'Prepare Telegram Data',
            'Save Proposal Checkpoint',
            'Prepare Telegram Notification',
            'Send Telegram Notification'
        ];

        console.log('\n--- Tracing "topic" field ---');

        const executionData = fullExecution.data.resultData.runData;

        nodesOfInterest.forEach(nodeName => {
            const nodeData = executionData[nodeName];
            if (!nodeData) {
                console.log(`[${nodeName}] NOT EXECUTED`);
                return;
            }

            console.log(`\n[${nodeName}]`);
            nodeData.forEach((execution, idx) => {
                const outputData = execution.data.main[0]; // Assuming main output, index 0
                if (outputData) {
                    outputData.forEach((item, itemIdx) => {
                        const topic = item.json.topic;
                        const thema = item.json.thema;
                        const chapters = item.json.chapterCount || item.json.chapters || 0;
                        const words = item.json.wordsPerChapter || item.json.words_per_chapter || 0;
                        console.log(`  Run ${idx} Item ${itemIdx}: topic="${topic}", chapters=${chapters}, words=${words}`);

                        // Inspect Create E-Book Proposals output specifically
                        if (nodeName === 'Create E-Book Proposals') {
                            // Log all keys to see if Supabase returned anything
                            console.log(`  Keys: ${Object.keys(item.json).join(', ')}`);
                        }
                    });
                }
            });
        });

    } catch (err) {
        console.error('Error:', err.message);
    }
}

debugExecution();
