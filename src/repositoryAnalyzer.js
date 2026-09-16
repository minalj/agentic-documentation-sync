const fs = require("fs");
const path = require("path");


function detectApiEndpoints(rootDir, files) {
  const endpoints = [];

  const supportedExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".py"
  ]);

  for (const file of files) {
    const extension = path.extname(file.path).toLowerCase();

    if (!supportedExtensions.has(extension)) {
      continue;
    }

    let content;

    try {
      content = fs.readFileSync(
        path.join(rootDir, file.path),
        "utf8"
      );
    } catch {
      continue;
    }

    const patterns = [
      /\bapp\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /\brouter\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /\brouter\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g
    ];

    for (const pattern of patterns) {
      let match;

      while ((match = pattern.exec(content)) !== null) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          source: file.path
        });
      }
    }
  }

  return endpoints;
}

const NOT_AVAILABLE = "Not available/Not found in repository";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "vendor"
]);

const IGNORED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
  ".pdf", ".zip", ".tar", ".gz", ".jar",
  ".exe", ".dll", ".so", ".dylib",
  ".mp3", ".mp4", ".mov"
]);

const MAX_FILE_SIZE = 1024 * 1024;

function isIgnoredFile(filePath) {
  return IGNORED_EXTENSIONS.has(
    path.extname(filePath).toLowerCase()
  );
}

function collectFiles(rootDir, currentDir = rootDir, result = [], skipped = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        skipped.push({
          file: relativePath,
          reason: "ignored directory"
        });
        continue;
      }

      collectFiles(rootDir, fullPath, result, skipped);
      continue;
    }

    if (!entry.isFile()) {
      skipped.push({
        file: relativePath,
        reason: "unsupported filesystem entry"
      });
      continue;
    }

    if (isIgnoredFile(fullPath)) {
      skipped.push({
        file: relativePath,
        reason: "unsupported or binary file"
      });
      continue;
    }

    const stats = fs.statSync(fullPath);

    if (stats.size > MAX_FILE_SIZE) {
      skipped.push({
        file: relativePath,
        reason: "individual file size limit exceeded"
      });
      continue;
    }

    result.push({
      path: relativePath,
      size: stats.size
    });
  }

  return { files: result, skipped };
}

function detectLanguages(files) {
  const languageMap = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".py": "Python",
    ".go": "Go",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".rb": "Ruby",
    ".php": "PHP",
    ".kt": "Kotlin",
    ".swift": "Swift"
  };

  const languages = new Set();

  for (const file of files) {
    const extension = path.extname(file.path).toLowerCase();

    if (languageMap[extension]) {
      languages.add(languageMap[extension]);
    }
  }

  return Array.from(languages).sort();
}

function findFiles(files, names) {
  const normalizedNames = new Set(
    names.map((name) => name.toLowerCase())
  );

  return files
    .filter((file) =>
      normalizedNames.has(
        path.basename(file.path).toLowerCase()
      )
    )
    .map((file) => file.path);
}

function detectEntryPoints(files) {
  const candidates = [
    "src/index.js",
    "src/main.js",
    "index.js",
    "main.js",
    "app.js",
    "server.js"
  ];

  return candidates.filter((candidate) =>
    files.some((file) => file.path === candidate)
  );
}

function readPackageJson(rootDir, files) {
  const packageFile = files.find(
    (file) => file.path === "package.json"
  );

  if (!packageFile) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        path.join(rootDir, packageFile.path),
        "utf8"
      )
    );
  } catch {
    return null;
  }
}


function detectConfiguration(rootDir, files) {
  const configurationFiles = [];
  const environmentVariables = [];

  const configFileNames = new Set([
    ".env",
    ".env.example",
    ".env.local",
    ".env.development",
    ".env.production",
    "config.js",
    "config.json",
    "config.yaml",
    "config.yml",
    "application.properties",
    "application.yml",
    "application.yaml"
  ]);

  for (const file of files) {
    const baseName = path.basename(file.path);

    if (configFileNames.has(baseName)) {
      configurationFiles.push(file.path);
    }

    const extension = path.extname(file.path).toLowerCase();

    if (
      ![
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".java",
        ".py",
        ".json",
        ".yml",
        ".yaml",
        ".properties"
      ].includes(extension)
    ) {
      continue;
    }

    let content;

    try {
      content = fs.readFileSync(
        path.join(rootDir, file.path),
        "utf8"
      );
    } catch {
      continue;
    }

    const patterns = [
      /process\.env\.([A-Z][A-Z0-9_]*)/g,
      /System\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g
    ];

    for (const pattern of patterns) {
      let match;

      while ((match = pattern.exec(content)) !== null) {
        environmentVariables.push({
          name: match[1],
          source: file.path
        });
      }
    }
  }

  const uniqueConfigurationFiles = [
    ...new Set(configurationFiles)
  ];

  const uniqueEnvironmentVariables =
    environmentVariables.filter(
      (item, index, array) =>
        index ===
        array.findIndex(
          (candidate) =>
            candidate.name === item.name &&
            candidate.source === item.source
        )
    );

  return {
    files: uniqueConfigurationFiles.length
      ? uniqueConfigurationFiles
      : NOT_AVAILABLE,

    environmentVariables: uniqueEnvironmentVariables.length
      ? uniqueEnvironmentVariables
      : NOT_AVAILABLE,

    profiles: NOT_AVAILABLE,

    requiredValues: NOT_AVAILABLE
  };
}

function analyzeRepository(rootDir, options = {}) {
  const absoluteRoot = path.resolve(rootDir);

  if (!fs.existsSync(absoluteRoot)) {
    throw new Error(
      "Repository path does not exist: " + absoluteRoot
    );
  }

  if (!fs.statSync(absoluteRoot).isDirectory()) {
    throw new Error(
      "Repository path is not a directory: " + absoluteRoot
    );
  }

  const analysisTimestamp = new Date().toISOString();

  const result = collectFiles(absoluteRoot);
  const files = result.files;
  const skipped = result.skipped;

  const packageMetadata = readPackageJson(
    absoluteRoot,
    files
  );

  const languages = detectLanguages(files);

  const readmeFiles = findFiles(files, [
    "README",
    "README.md",
    "README.txt"
  ]);

  const dependencyFiles = findFiles(files, [
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pom.xml",
    "requirements.txt",
    "go.mod"
  ]);

  const configurationFiles = files
    .map((file) => file.path)
    .filter((filePath) =>
      /\.(env|yaml|yml|toml|ini|properties)$/i.test(filePath) ||
      /(^|\/)(config|configuration)(\/|\.|$)/i.test(filePath)
    );

  const testFiles = files
    .map((file) => file.path)
    .filter((filePath) =>
      /(^|\/)(__tests__|tests?|spec)(\/|$)/i.test(filePath) ||
      /\.(test|spec)\.[^.]+$/i.test(filePath)
    );

  const entryPoints = detectEntryPoints(files);
  const configuration = detectConfiguration(absoluteRoot, files);
  const apiEndpoints = detectApiEndpoints(absoluteRoot, files);

  const applicationName =
    packageMetadata?.name ||
    path.basename(absoluteRoot) ||
    NOT_AVAILABLE;

  const description =
    packageMetadata?.description ||
    NOT_AVAILABLE;

  const dependencies = packageMetadata
    ? {
        dependencies: packageMetadata.dependencies || {},
        devDependencies: packageMetadata.devDependencies || {}
      }
    : NOT_AVAILABLE;

  return {
    repositoryMetadata: {
      name: applicationName,
      url: options.repositoryUrl || NOT_AVAILABLE,
      analysisTimestamp,
      branchOrCommit: options.branchOrCommit || NOT_AVAILABLE,
      languages,
      fileCount: files.length,
      skippedFileCount: skipped.length,

      importantFiles: {
        readme: readmeFiles.length
          ? readmeFiles
          : NOT_AVAILABLE,

        dependencies: dependencyFiles.length
          ? dependencyFiles
          : NOT_AVAILABLE,

        configuration: configurationFiles.length
          ? configurationFiles
          : NOT_AVAILABLE,

        tests: testFiles.length
          ? testFiles
          : NOT_AVAILABLE,

        entryPoints: entryPoints.length
          ? entryPoints
          : NOT_AVAILABLE
      }
    },

    systemPurpose: {
      applicationName,
      businessPurpose: description,
      mainFunctionality: description,
      targetUsers: NOT_AVAILABLE,
      businessDomain: NOT_AVAILABLE
    },

    architecture: {
      overallArchitecture: NOT_AVAILABLE,
      components: entryPoints.length
        ? entryPoints
        : NOT_AVAILABLE,
      responsibilities: NOT_AVAILABLE,
      communication: NOT_AVAILABLE,
      architecturalPatterns: NOT_AVAILABLE,
      externalSystems: NOT_AVAILABLE,
      integrations: NOT_AVAILABLE
    },

    apisAndInterfaces: {
      rest: apiEndpoints.length ? true : NOT_AVAILABLE,
      graphql: NOT_AVAILABLE,
      soap: NOT_AVAILABLE,
      endpoints: apiEndpoints.length ? apiEndpoints : NOT_AVAILABLE,
      authentication: NOT_AVAILABLE,
      externalServices: NOT_AVAILABLE
    },

    technologyAndDependencies: {
      languages,
      runtime: packageMetadata?.engines || NOT_AVAILABLE,
      frameworks: NOT_AVAILABLE,
      libraries: dependencies,
      buildTools: NOT_AVAILABLE
    },

    setupAndInstallation: {
      packageManager: packageMetadata
        ? "npm"
        : NOT_AVAILABLE,
      commands: packageMetadata?.scripts || NOT_AVAILABLE
    },

    configuration: {
      files: configuration.files,
      environmentVariables: configuration.environmentVariables,
      profiles: configuration.profiles,
      requiredValues: configuration.requiredValues
    },

    deployment: {
      method: NOT_AVAILABLE,
      environments: NOT_AVAILABLE,
      containers: NOT_AVAILABLE,
      cicd: NOT_AVAILABLE,
      cloudPlatform: NOT_AVAILABLE,
      commands: NOT_AVAILABLE
    },

    testing: {
      frameworks: NOT_AVAILABLE,

      testFiles: testFiles.length
        ? testFiles
        : NOT_AVAILABLE,

      commands: packageMetadata?.scripts?.test ||
        NOT_AVAILABLE,

      coverage: NOT_AVAILABLE,
      configuration: NOT_AVAILABLE
    },

    documentation: {
      readmeFiles: readmeFiles.length
        ? readmeFiles
        : NOT_AVAILABLE
    },

    risksAndGaps: {
      skippedFiles: skipped,

      missingInformation: [
        "business purpose",
        "target users",
        "business domain",
        "architecture details",
        "API details",
        "deployment details"
      ]
    },

    files: files.map((file) => file.path),
    skipped
  };
}

module.exports = {
  NOT_AVAILABLE,
  analyzeRepository
};
