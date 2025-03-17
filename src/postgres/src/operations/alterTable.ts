import { Pool } from "pg";

export const alterTable = async (pool: Pool, request: any) => {
  if (request.params.name === "alterTable") {
    const { table, alteration } = request.params.arguments;

    const client = await pool.connect();
    try {
      const query = `ALTER TABLE ${table} ${alteration}`;
      await client.query(query);

      return {
        content: [{ type: "text", text: `Table ${table} altered successfully` }],
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
