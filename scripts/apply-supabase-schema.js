const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { Client } = require("pg");

const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
const configPath = path.join(__dirname, "..", "pages", "config.js");
const poolerRegions = [
  process.env.SUPABASE_DB_REGION,
  "eu-west-1",
  "eu-central-1",
  "eu-west-3",
  "eu-west-2",
  "eu-north-1",
  "us-east-1",
  "us-west-1",
  "us-west-2"
].filter(Boolean);

function readProjectRefFromConfig() {
  if (!fs.existsSync(configPath)) return "";
  const configSource = fs.readFileSync(configPath, "utf8");
  const match = configSource.match(/url:\s*"https:\/\/([a-z0-9-]+)\.supabase\.co"/i);
  return match ? match[1] : "";
}

function buildConnectionString() {
  if (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) {
    return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const user = process.env.SUPABASE_DB_USER || "postgres";
  const projectRef = process.env.SUPABASE_PROJECT_REF || readProjectRefFromConfig();

  if (!password || !projectRef) {
    return "";
  }

  return "postgresql://" + encodeURIComponent(user) + ":" + encodeURIComponent(password) +
    "@db." + projectRef + ".supabase.co:5432/postgres";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getParsedConnectionString(connectionString) {
  try {
    return new URL(connectionString);
  } catch (_error) {
    return null;
  }
}

function getProjectRef(connectionString) {
  const configured = process.env.SUPABASE_PROJECT_REF || readProjectRefFromConfig();
  if (configured) return configured;

  const parsed = getParsedConnectionString(connectionString);
  if (!parsed) return "";

  const match = parsed.hostname.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i);
  return match ? match[1] : "";
}

function getBaseUser(connectionString) {
  if (process.env.SUPABASE_DB_USER) return process.env.SUPABASE_DB_USER;
  const parsed = getParsedConnectionString(connectionString);
  return parsed ? decodeURIComponent(parsed.username || "postgres") : "postgres";
}

function getPassword(connectionString) {
  if (process.env.SUPABASE_DB_PASSWORD) return process.env.SUPABASE_DB_PASSWORD;
  const parsed = getParsedConnectionString(connectionString);
  return parsed ? decodeURIComponent(parsed.password || "") : "";
}

function getDatabaseName(connectionString) {
  const parsed = getParsedConnectionString(connectionString);
  return parsed ? decodeURIComponent(parsed.pathname.replace(/^\//, "") || "postgres") : "postgres";
}

async function buildDirectClientConfig(connectionString) {
  const parsed = getParsedConnectionString(connectionString);
  if (!parsed) {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false }
    };
  }

  const hostname = parsed.hostname;
  const sslOptions = { rejectUnauthorized: false };

  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (_error) {}

  try {
    const resolved = await dns.promises.lookup(hostname, { family: 4 });
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: resolved.address,
      port: Number(parsed.port || 5432),
      database: getDatabaseName(connectionString),
      ssl: Object.assign({ servername: hostname }, sslOptions)
    };
  } catch (_error) {
    return {
      connectionString,
      ssl: sslOptions
    };
  }
}

function buildPoolerConfigs(connectionString) {
  const password = getPassword(connectionString);
  const projectRef = getProjectRef(connectionString);
  const baseUser = getBaseUser(connectionString);
  const database = getDatabaseName(connectionString);

  if (!password || !projectRef) return [];

  return unique(poolerRegions).map(function(region) {
    return {
      label: "pooler:" + region,
      user: baseUser + "." + projectRef,
      password,
      host: "aws-0-" + region + ".pooler.supabase.com",
      port: 5432,
      database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    };
  });
}

async function executeSchema(clientConfig, sql) {
  const client = new Client(clientConfig);
  try {
    await client.connect();
    await client.query(sql);
  } finally {
    await client.end().catch(function() {});
  }
}

const connectionString = buildConnectionString();

if (!connectionString) {
  console.error(
    "Falta SUPABASE_DB_URL/DATABASE_URL o bien SUPABASE_DB_PASSWORD (y opcionalmente SUPABASE_PROJECT_REF/SUPABASE_DB_USER)."
  );
  process.exit(1);
}

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  const directConfig = await buildDirectClientConfig(connectionString);

  try {
    await executeSchema(directConfig, sql);
    console.log("Esquema de Supabase aplicado correctamente desde supabase/schema.sql");
    return;
  } catch (directError) {
    const poolerConfigs = buildPoolerConfigs(connectionString);

    for (const poolerConfig of poolerConfigs) {
      try {
        await executeSchema(poolerConfig, sql);
        console.log("Esquema de Supabase aplicado correctamente desde supabase/schema.sql");
        return;
      } catch (_poolerError) {}
    }

    throw directError;
  }
}

main().catch(function(error) {
  console.error("No se pudo aplicar el esquema de Supabase:", error.message);
  process.exit(1);
});
