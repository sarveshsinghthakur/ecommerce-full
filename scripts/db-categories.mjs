import { Client } from "pg";

const env = await import("node:fs").then((fs) =>
  fs.readFileSync(".env.local", "utf8"),
);
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");

const c = new Client({ connectionString: url });
await c.connect();
const cats = await c.query(`select id, name, slug from categories order by position`);
for (const r of cats.rows) console.log(`${r.slug}\t${r.name}\t${r.id}`);
await c.end();
