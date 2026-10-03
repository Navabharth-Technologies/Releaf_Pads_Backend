const { pool } = require('./db.js');
pool.query("SELECT name FROM sysobjects WHERE xtype='U'")
  .then(r => { console.log(r.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
