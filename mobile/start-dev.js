const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, 'app.config.js');
const NGROK_LOG_PATH = path.join(__dirname, '..', 'ngrok.log');

function getNgrokUrl() {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
                const httpsTunnel = response.data.tunnels.find(t => t.proto === 'https');
                if (httpsTunnel) {
                    resolve(httpsTunnel.public_url);
                } else {
                    reject('No ngrok HTTPS tunnel found');
                }
            } catch (error) {
                reject('Could not connect to ngrok API. Is ngrok running?');
            }
        }, 3000); // Wait 3 seconds for ngrok to initialize
    });
}

async function updateConfigFile(ngrokUrl) {
    // Dynamically import the config file to get the live object
    const config = require(CONFIG_PATH).default;

    if (config.expo.extra.ngrokUrl === ngrokUrl) {
        console.log('ngrok URL is already up to date in app.config.js.');
        return;
    }

    config.expo.extra.ngrokUrl = ngrokUrl;

    // Convert the object back to a string, formatted nicely
    const newConfigContent = `export default ${JSON.stringify(config, null, 4)};\n`;

    return new Promise((resolve, reject) => {
        fs.writeFile(CONFIG_PATH, newConfigContent, 'utf8', (err) => {
            if (err) {
                return reject(`Failed to write app.config.js: ${err}`);
            }
            console.log(`Successfully updated app.config.js with URL: ${ngrokUrl}`);
            resolve();
        });
    });
}

function startExpo() {
    console.log('Starting Expo server...');
    const expoProcess = spawn('npx', ['expo', 'start', '--ios', '--clear', '--tunnel'], {
        cwd: __dirname,
        stdio: 'inherit', // This will pipe stdout/stderr/stdin to the parent
    });

    expoProcess.on('close', (code) => {
        console.log(`Expo process exited with code ${code}`);
    });
}

// Function to check if the backend is healthy
const checkBackendHealth = () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/health',
            method: 'GET',
        };

        const req = http.get(options, (res) => {
            if (res.statusCode === 200) {
                console.log('Backend is healthy!');
                resolve(true);
            } else {
                resolve(false);
            }
        });

        req.on('error', () => {
            resolve(false);
        });
    });
};

// Function to wait for the backend to become healthy
const waitForBackend = async () => {
    console.log('Waiting for backend to become healthy...');
    let isHealthy = false;
    while (!isHealthy) {
        isHealthy = await checkBackendHealth();
        if (!isHealthy) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
};

async function main() {
    try {
        await waitForBackend();

        console.log('Starting ngrok tunnel...');
        const ngrokLogFd = fs.openSync(NGROK_LOG_PATH, 'a');
        const ngrokProcess = spawn('ngrok', [
            'http',
            '8000',
            '--request-header-add',
            'ngrok-skip-browser-warning:true',
            '--log=stdout'
        ], {
            detached: true,
            stdio: ['ignore', ngrokLogFd, ngrokLogFd],
        });

        ngrokProcess.unref();

        console.log(`ngrok process started with PID: ${ngrokProcess.pid}. Logging to ${NGROK_LOG_PATH}`);

        const ngrokUrl = await getNgrokUrl();
        console.log(`ngrok tunnel is live at: ${ngrokUrl}`);

        await updateConfigFile(ngrokUrl);

        startExpo();

    } catch (error) {
        console.error('Failed to start development environment:', error);
        process.exit(1);
    }
}

main(); 