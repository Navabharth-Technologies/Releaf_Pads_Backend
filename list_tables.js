const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgres://releaf_db_user:A5po9SYOqeMqDHUWHO3LkkvFZPWGwxDP@dpg-da5uv1ojo6nc73dq9j6g-a.oregon-postgres.render.com:5432/releaf_db', 
  ssl: { rejectUnauthorized: false } 
});

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(res => { 
  console.log(res.rows.map(r => r.table_name)); 
  pool.end(); 
}).catch(console.error);
