const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public'
});
client.connect().then(() => {
  client.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'User\'').then(res => {
    console.log(res.rows);
    client.end();
  });
});
