const fs = require('fs');

// Manually parse env file and put it into process.env
const envPath = 'c:/Users/DAYONOT/OneDrive/DECTA/DECTA-POLLS/decta_polls_voting/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    process.env[key] = val;
  }
});

const { triggerNotification } = require('../src/lib/server/notifications');

async function testTrigger() {
  const tenantId = '7a31468c-c742-4d69-af1f-1a0f7b0ba7ef';
  const electionId = '7a197091-abea-42ec-8ac5-3cea3409d2f0';

  console.log("Starting triggerNotification test...");
  
  try {
    await triggerNotification('Election End', tenantId, electionId);
    console.log("triggerNotification completed without exceptions.");
  } catch (err) {
    console.error("Test Exception:", err);
  }
}

testTrigger();
