import { Pool } from "pg";

export const deleteOp = async (pool: Pool, request: any) => {
  if (request.params.name === "delete") {
    const { table, where } = request.params.arguments;

    const client = await pool.connect();
    try {
      const whereKeys = Object.keys(where);
      if (whereKeys.length !== 1) {
        throw new Error("WHERE clause must have exactly one key");
      }
      const whereKey = whereKeys[0];
      const whereValue = where[whereKey];

      const query = `DELETE FROM ${table} WHERE "${whereKey}" = $1 RETURNING *`;
      const result = await client.query(query, [whereValue]);

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
