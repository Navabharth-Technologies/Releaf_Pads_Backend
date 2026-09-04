const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://releaf_db_user:A5po9SYOqeMqDHUWHO3LkkvFZPWGwxDP@dpg-da5uv1ojo6nc73dq9j6g-a.oregon-postgres.render.com:5432/releaf_db?ssl=true' });
pool.query('SELECT * FROM Product').then(res=>console.log(res.rows)).catch(e=>console.log(e)).finally(()=>process.exit(0));
