import pg from "pg";

export const createPool = (databaseUrl: string) => {
  const resourceBaseUrl = new URL(databaseUrl);
  resourceBaseUrl.protocol = "postgres:";
  resourceBaseUrl.password = "";

  const pool = new pg.Pool({
    connectionString: databaseUrl,
  });

  return { pool, resourceBaseUrl };
};
