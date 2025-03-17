import dbPool from "../commons/db.js";

export const dropTable = async (request: any) => {
  if (request.params.name === "dropTable") {
    const { table } = request.params.arguments;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(`DROP TABLE ${table}`);
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
