import dbPool from "../commons/db.js";

export const update = async (request: any) => {
  if (request.params.name === "update") {
    const { table, data, where } = request.params.arguments;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(`UPDATE ${table} SET ? WHERE ?`, [
        data,
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
