import { readFileSync, writeFileSync } from 'fs';
import { get } from 'axios';

(async () => {
  try {
    // Get the current ngrok URL from the local web interface API
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
