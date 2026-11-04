const { pool } = require('./db.js');
async function run() {
  try {
    await pool.query(`ALTER AUTHORIZATION ON SCHEMA::[releaf_api_user] TO [dbo]`);
    console.log('Schema authorization updated');
    await pool.query(`DROP USER releaf_api_user`);
    console.log('User dropped successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
