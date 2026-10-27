// scripts/test-raw-error.mjs
const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';
const runId = Date.now().toString(36);

const samplePayload = {
  intake: {
    eventType: 'Wedding',
    city: 'Jaipur',
    date: '2027-04-15',
    guestCount: 300,
    totalBudget: 2500000,
    currency: 'INR',
    styleCulture: 'Traditional Royal Rajasthani with Mehendi and Sangeet',
    nonNegotiables: `Dedicated Jain catering counter [Fresh-${runId}]`,
  },
};

async function main() {
  const res = await fetch(`${BASE_URL}/api/plan/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-disable-template-fallback': 'true',
    },
    body: JSON.stringify(samplePayload),
  });
  console.log('HTTP Status:', res.status, res.statusText);
  const data = await res.json().catch((e) => e.message);
  console.log('Response JSON:', data);
}

main();
