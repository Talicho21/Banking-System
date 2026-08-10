const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '@Talicho1995',
  database: 'MiniCoreBanking',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function test() {
  try {
    const status = 'All';
    const search = '';
    const limit = 200;
    const productId = null;

    const [rows] = await db.execute(
      `
      SELECT
        a.account_id AS accountId,
        a.account_number AS accountNumber,
        a.client_id AS clientId,
        a.product_id AS productId,
        p.product_name AS productName,
        a.branch_id AS branchId,
        a.status AS status,
        a.balance AS balance,
        a.created_at AS createdAt
      FROM accounts a
      INNER JOIN products p ON p.product_id = a.product_id
      WHERE (? = 'All' OR a.status = ?)
        AND (? IS NULL OR a.product_id = ?)
        AND (
          ? = ''
          OR CAST(a.account_number AS CHAR) LIKE CONCAT('%', ?, '%')
          OR CAST(a.client_id AS CHAR) LIKE CONCAT('%', ?, '%')
        )
      ORDER BY a.created_at DESC
      LIMIT ?
      `,
      [status, status, productId, productId, search, search, search, String(limit)]
    );
    console.log("SUCCESS:", rows.length);
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    process.exit();
  }
}

test();
