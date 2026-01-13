const https = require('https');

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
                        resolve({}); // PUT might perform update but return incomplete json?
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

async function fixConnections() {
    try {
        console.log('Fetching workflow...');
        const workflow = await request(`/workflows/${WORKFLOW_ID}`, 'GET');

        const checkNodeName = 'Check: All Proposals Done?';
        const prepareNodeName = 'Prepare Telegram Data';
        const notificationNodeName = 'Send Telegram Notification';
        const loopNodeName = 'Split into Proposals';

        if (!workflow.connections[checkNodeName]) {
            throw new Error(`Node "${checkNodeName}" has no connections!`);
        }

        console.log('Current connections for Check node:', JSON.stringify(workflow.connections[checkNodeName], null, 2));

        // Define correct connections
        // True -> Prepare Telegram Data
        // False -> Split into Proposals
        // Main -> (Should mimic True/False structure or be clean)

        // We want to REMOVE any connection to "Send Telegram Notification" from "Check: All Proposals Done?"

        const newConnections = {
            ...workflow.connections,
            [checkNodeName]: {
                "main": [
                    [
                        {
                            "node": prepareNodeName,
                            "type": "main",
                            "index": 0
                        }
                    ]
                ],
                "true": [
                    [
                        {
                            "node": prepareNodeName,
                            "type": "main",
                            "index": 0
                        }
                    ]
                ],
                "false": [
                    [
                        {
                            "node": loopNodeName,
                            "type": "loop", // Preserving loop type
                            "index": 0
                        }
                    ]
                ]
            }
        };

        // Note: n8n connections structure for "main" usually groups outputs. 
        // IF node outputs are usually mapped to "main" index 0 (true) and index 1 (false) in UI representation but
        // under the hood "main" might just be a list of outputs if not using explicit true/false keys?
        // Actually, n8n JSON format for IF node usually has "main": [[true_targets], [false_targets]].
        // BUT the 'connections' object uses keys "main", "true", "false".

        // Let's rely on what we saw: 
        // "true": [[Send...]] -> Bad. Change to [[Prepare...]]
        // "false": [[Split...]] -> Good. Keep.
        // "main": [[Prepare...], [Send...]] -> Bad. This implies output 0 goes to Prepare, Output 1 goes to Send.
        // Ideally main for IF node is [[...true...], [...false...]].

        // Let's refine the "main":
        newConnections[checkNodeName]["main"] = [
            [
                {
                    "node": prepareNodeName,
                    "type": "main",
                    "index": 0
                }
            ],
            [
                {
                    "node": loopNodeName,
                    "type": "loop",
                    "index": 0
                }
            ]
        ];

        // Also explicitly set keys for compatibility
        // Actually, if we set "main" correctly, n8n might derive true/false? 
        // Just to be safe, I will set all 3 properties if they exist in current.

        console.log('New connections for Check node:', JSON.stringify(newConnections[checkNodeName], null, 2));

        // Prepare payload
        const payload = {
            name: workflow.name,
            nodes: workflow.nodes,
            connections: newConnections,
            settings: workflow.settings
        };

        console.log('Uploading updated workflow connections...');
        await request(`/workflows/${WORKFLOW_ID}`, 'PUT', payload);
        console.log('Workflow connections updated successfully!');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixConnections();
