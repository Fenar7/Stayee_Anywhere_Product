const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Stayee7865@localhost:5432/staye_db' });
client.connect()
  .then(() => { console.log('Connected successfully!'); client.end(); })
  .catch(err => console.error('Connection error', err.stack));