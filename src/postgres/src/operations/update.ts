import { Pool } from "pg";

export const update = async (pool: Pool, request: any) => {
  if (request.params.name === "update") {
    const { table, data, where } = request.params.arguments;

    const client = await pool.connect();
    try {
      const setClauses = Object.keys(data)
        .map((key, i) => `"${key}" = $${i + 1}`)
        .join(", ");
      const values = Object.values(data);

      const whereKeys = Object.keys(where);
      if (whereKeys.length !== 1) {
        throw new Error("WHERE clause must have exactly one key");
      }
      const whereKey = whereKeys[0];
      const whereValue = where[whereKey];

      const query = `UPDATE ${table} SET ${setClauses} WHERE "${whereKey}" = $${values.length + 1} RETURNING *`;
      const result = await client.query(query, [...values, whereValue]);

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
