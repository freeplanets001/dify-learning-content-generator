import axios from 'axios';

const apiKey = 'app-UryAL0OmiRCXW7u32qGpyJkG';
const baseUrl = 'https://api.dify.ai/v1';

async function test() {
    console.log('Testing Dify Connection (Comprehensive)...');
    console.log(`Key: ${apiKey}`);

    // Create client
    const client = axios.create({
        baseURL: baseUrl,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on error status
    });

    // 1. Test /parameters (Chat/Agent App)
    console.log('\n--- Test 1: GET /parameters ---');
    const res1 = await client.get('/parameters');
    console.log(`Status: ${res1.status}`);
    if (res1.status === 200) {
        console.log('✅ Type: Likely Chat/Agent/TextGen App');
        console.log('Features:', JSON.stringify(Object.keys(res1.data), null, 0));
    } else {
        console.log('❌ Failed/Not Supported');
    }

    // 2. Test /workflows/run (Workflow App)
    console.log('\n--- Test 2: POST /workflows/run (Workflow App) ---');
    const res2 = await client.post('/workflows/run', {
        inputs: {},
        response_mode: 'blocking',
        user: 'debug-user'
    });
    console.log(`Status: ${res2.status} ${res2.statusText}`);
    console.log('Response:', JSON.stringify(res2.data).substring(0, 200));

    // 3. Test /chat-messages (Chat/Agent App)
    console.log('\n--- Test 3: POST /chat-messages (Chat/Agent App) ---');
    const res3 = await client.post('/chat-messages', {
        inputs: {},
        query: 'Hello',
        response_mode: 'blocking',
        user: 'debug-user',
        conversation_id: ''
    });
    console.log(`Status: ${res3.status} ${res3.statusText}`);
    console.log('Response:', JSON.stringify(res3.data).substring(0, 200));

    // 4. Test /completion-messages (Text Generation App)
    console.log('\n--- Test 4: POST /completion-messages (Text Generator App) ---');
    const res4 = await client.post('/completion-messages', {
        inputs: {},
        response_mode: 'blocking',
        user: 'debug-user'
    });
    console.log(`Status: ${res4.status} ${res4.statusText}`);
    console.log('Response:', JSON.stringify(res4.data).substring(0, 200));
}

test();
