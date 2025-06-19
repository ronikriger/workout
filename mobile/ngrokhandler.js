const fs = require('fs');
const axios = require('axios');

// ngrok's local API is on port 4040 by default
axios.get('http://127.0.0.1:4040/api/tunnels')
    .then(resp => {
        const httpsTunnel = resp.data.tunnels.find(t => t.proto === 'https');
        if (!httpsTunnel) {
            console.error('Could not find an HTTPS tunnel. Make sure ngrok is running.');
            process.exit(1);
        }
        const url = httpsTunnel.public_url;
        fs.writeFileSync('./NGROK_URL', url);
        console.log(`ngrok URL (${url}) written to NGROK_URL`);
    })
    .catch(e => {
        if (e.code === 'ECONNREFUSED') {
            console.error('Could not connect to ngrok API. Make sure ngrok is running. Start it with `ngrok http 8000` in another terminal.');
        } else {
            console.error('An error occurred:', e.message);
        }
        process.exit(1);
    }); 