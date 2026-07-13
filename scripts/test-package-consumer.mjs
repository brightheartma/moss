import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const node = process.execPath;
const pnpmCli = process.env.npm_execpath;

if (!pnpmCli) {
  throw new Error("run the package consumer through `pnpm test:package`");
}

const packages = [
  { name: "@themoss/core", directory: "packages/core", archive: "core.tgz" },
  { name: "@themoss/erc", directory: "packages/erc", archive: "erc.tgz" },
  { name: "@themoss/simulator", directory: "packages/simulator", archive: "simulator.tgz" },
  { name: "@themoss/system", directory: "packages/system", archive: "system.tgz" },
  {
    name: "@themoss/protocol-kuru",
    directory: "packages/protocols/kuru",
    archive: "protocol-kuru.tgz",
  },
  {
    name: "@themoss/mcp-server",
    directory: "packages/mcp-server",
    archive: "mcp-server.tgz",
  },
];

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd ?? root,
    env: process.env,
    stdio: options.stdio ?? "inherit",
  });
}

function runPnpm(args, options = {}) {
  run(node, [pnpmCli, ...args], options);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const typescript = readJson(join(root, "node_modules/typescript/package.json"));
if (!/^6\.0\./.test(typescript.version)) {
  throw new Error(`package consumer test requires TypeScript 6.0.x, found ${typescript.version}`);
}
const nodeTypes = readJson(join(root, "node_modules/@types/node/package.json"));

const temporaryRoot = mkdtempSync(join(tmpdir(), "moss-package-consumer-"));
const archives = join(temporaryRoot, "archives");
const consumer = join(temporaryRoot, "consumer");

try {
  mkdirSync(archives);
  cpSync(join(root, "tests/package-consumer"), consumer, { recursive: true });

  const dependencies = {};
  for (const workspacePackage of packages) {
    const archive = join(archives, workspacePackage.archive);
    runPnpm(["pack", "--out", archive], {
      cwd: join(root, workspacePackage.directory),
      stdio: "pipe",
    });
    dependencies[workspacePackage.name] = `file:${archive}`;
  }

  writeFileSync(
    join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "moss-package-consumer",
        private: true,
        type: "module",
        packageManager: "pnpm@11.10.0",
        dependencies,
        devDependencies: {
          "@types/node": nodeTypes.version,
          typescript: typescript.version,
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(consumer, "pnpm-workspace.yaml"),
    `minimumReleaseAge: 10080\noverrides:\n${Object.entries(dependencies)
      .map(([name, archive]) => `  ${JSON.stringify(name)}: ${JSON.stringify(archive)}`)
      .join("\n")}\n`,
  );

  runPnpm(["install", "--prefer-offline", "--ignore-scripts", "--no-frozen-lockfile"], {
    cwd: consumer,
  });

  for (const workspacePackage of packages) {
    const manifest = readJson(
      join(consumer, "node_modules", workspacePackage.name, "package.json"),
    );
    if (manifest.engines?.node !== ">=22") {
      throw new Error(`${workspacePackage.name} must publish engines.node >=22`);
    }
  }

  const consumerTypescript = readJson(join(consumer, "node_modules/typescript/package.json"));
  if (!/^6\.0\./.test(consumerTypescript.version)) {
    throw new Error(`consumer installed TypeScript ${consumerTypescript.version}, expected 6.0.x`);
  }

  run(node, [join(consumer, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], {
    cwd: consumer,
  });
  run(node, ["runtime.mjs"], { cwd: consumer });

  const mcpManifestPath = join(consumer, "node_modules/@themoss/mcp-server/package.json");
  const mcpManifest = readJson(mcpManifestPath);
  const cli = mcpManifest.bin?.["moss-mcp"];
  if (typeof cli !== "string") {
    throw new Error("@themoss/mcp-server does not publish the moss-mcp bin entry");
  }

  const cliResult = spawnSync(node, [join(dirname(mcpManifestPath), cli)], {
    cwd: consumer,
    encoding: "utf8",
    env: {
      ...process.env,
      MOSS_CHAIN_ID: "143",
      MOSS_RPC_URL: "http://127.0.0.1:8545",
    },
    input: "",
  });
  if (cliResult.status !== 0) {
    throw new Error(`moss-mcp exited with ${cliResult.status}: ${cliResult.stderr}`);
  }
  if (!cliResult.stderr.includes("moss-mcp:")) {
    throw new Error(`moss-mcp did not report startup metadata: ${cliResult.stderr}`);
  }

  console.log(`package consumer passed with TypeScript ${consumerTypescript.version}`);
} finally {
  if (process.env.MOSS_KEEP_PACKAGE_TEST !== "1") {
    rmSync(temporaryRoot, { recursive: true, force: true });
  } else {
    console.log(`package consumer fixture kept at ${temporaryRoot}`);
  }
}
