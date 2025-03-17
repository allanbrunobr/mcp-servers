import { Pool } from "pg";

export const dropTable = async (pool: Pool, request: any) => {
  if (request.params.name === "dropTable") {
    const { table } = request.params.arguments;

    const client = await pool.connect();
    try {
      const query = `DROP TABLE ${table}`;
      await client.query(query);

      return {
        content: [{ type: "text", text: `Table ${table} dropped successfully` }],
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
