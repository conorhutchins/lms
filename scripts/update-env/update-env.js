import { readFileSync, writeFileSync } from 'fs';
import { get } from 'axios';

// this only works for local development and obviously got to run ngrok for it to get the URL

// the aim of this file is to update the .env.local file with the current ngrok URL
// this is so that we can use the ngrok URL to authenticate the user
// the ngrok URL is a temporary URL that is used to test the application
// it is not used in production

(async () => {
  try {
    // Grab the current ngrok URL from the local web interface API
    const response = await get('http://127.0.0.1:4040/api/tunnels');
    const tunnelUrl = response.data.tunnels.find(tunnel => tunnel.proto === 'https').public_url;

    // Update .env.local file
    const envFilePath = '.env.local';
    let envFileContent = readFileSync(envFilePath, 'utf8');

    envFileContent = envFileContent.replace(/NEXTAUTH_URL=.*/g, `NEXTAUTH_URL=${tunnelUrl}`);
    writeFileSync(envFilePath, envFileContent);

    console.log(`Updated .env.local with NEXTAUTH_URL=${tunnelUrl}`);
  } catch (error) {
    console.error('Failed to update .env.local:', error);
  }
})();
