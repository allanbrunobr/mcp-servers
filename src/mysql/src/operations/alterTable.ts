import dbPool from "../commons/db.js";

export const alterTable = async (request: any) => {
  if (request.params.name === "alterTable") {
    const { table, alteration } = request.params.arguments;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(
        `ALTER TABLE ${table} ${alteration}`
      );
      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
        isError: false,
      };
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
};
