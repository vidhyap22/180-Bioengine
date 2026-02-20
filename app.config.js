const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

// Load .env into extra so the app can read Supabase keys (works on web + native)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const extra = { ...(appJson.expo.extra || {}) };
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*EXPO_PUBLIC_(\w+)\s*=\s*(.+)\s*$/);
        if (match) {
          extra[`EXPO_PUBLIC_${match[1]}`] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    }
  } catch (e) {
    // ignore
  }
  return extra;
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: loadEnv(),
  },
};
