import { Pool } from "pg";

export const createTable = async (pool: Pool, request: any) => {
  if (request.params.name === "createTable") {
    const { table, schema } = request.params.arguments;

    const client = await pool.connect();
    try {
      const query = `CREATE TABLE ${table} (${schema})`;
      await client.query(query);

      return {
        content: [{ type: "text", text: `Table ${table} created successfully` }],
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
