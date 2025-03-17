import dbPool from "../commons/db.js";

export const createTable = async (request: any) => {
  if (request.params.name === "createTable") {
    const { table, schema } = request.params.arguments;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(
        `CREATE TABLE ${table} (${schema})`
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
