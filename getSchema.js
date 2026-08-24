const sql = require('mssql/msnodesqlv8');

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'releaf_pads',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true,
  }
};

async function getSchema() {
  try {
    const pool = await new sql.ConnectionPool(config).connect();
    const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME IN ('Product', 'Customer', 'CustomerAddress', 'DeliveryPartner', 'Order', 'OrderItem')
    `);
    console.log(JSON.stringify(result.recordset, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getSchema();
