import { Pool } from "pg";

export const insert = async (pool: Pool, request: any) => {
  if (request.params.name === "insert") {
    const { table, data } = request.params.arguments;

    const client = await pool.connect();
    try {
      const columns = Object.keys(data).join(", ");
      const values = Object.values(data);
      const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(", ");

      const query = `INSERT INTO ${table} (${columns}) VALUES (${valuePlaceholders}) RETURNING *`;
      const result = await client.query(query, values);

      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
        isError: false,
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
};
