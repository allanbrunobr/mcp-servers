import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.MYSQL_URL;
if (!databaseUrl) {
  console.error("MYSQL_URL environment variable is required");
  process.exit(1);
}

// Parse the database URL to extract connection parameters
const dbPool = mysql.createPool(databaseUrl);

export default dbPool;

// mysql -h 34.95.196.114 -P 3306 -u root -p'!QAZ2wsx#EDC' mprs
