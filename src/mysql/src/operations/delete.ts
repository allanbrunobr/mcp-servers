import dbPool from "../commons/db.js";

export const deleteOp = async (request: any) => {
  if (request.params.name === "delete") {
    const { table, where } = request.params.arguments;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(`DELETE FROM ${table} WHERE ?`, [
        where,
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
