const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://admin:password@localhost:5432/medusa_db' });
client.connect().then(async () => {
  try {
    const res = await client.query('SELECT id, email FROM "user"');
    console.log('Users:', res.rows);
    const authRes = await client.query('SELECT id, app_metadata, provider_identities FROM auth_identity');
    console.log('Auth Identities:', JSON.stringify(authRes.rows, null, 2));
  } finally {
    await client.end();
  }
}).catch(console.error);
