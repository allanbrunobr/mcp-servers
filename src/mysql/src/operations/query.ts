import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dbPool from "../commons/db.js";

export const query = async (request: any) => {
  if (request.params.name === "query") {
    const sql = request.params.arguments?.sql as string;

    const connection = await dbPool.getConnection();
    try {
      const [rows] = await connection.query(sql);
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
