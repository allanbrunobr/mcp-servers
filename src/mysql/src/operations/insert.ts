import dbPool from "../commons/db.js";

export const insert = async (request: any) => {
  if (request.params.name === "insert") {
    const { table, data } = request.params.arguments;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(`INSERT INTO ${table} SET ?`, [
        data,
      ]);
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
