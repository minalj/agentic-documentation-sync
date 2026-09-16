const path = require("path");

const {
  analyzeRepository,
  NOT_AVAILABLE
} = require("../src/repositoryAnalyzer");

describe("Repository Analyzer", () => {
  const repositoryRoot = path.resolve(__dirname, "..");

  let result;

  beforeAll(() => {
    result = analyzeRepository(repositoryRoot);
  });

  test("should return repository metadata", () => {
    expect(result.repositoryMetadata).toBeDefined();
    expect(result.repositoryMetadata.name).toBe(
      "agentic-documentation-sync"
    );
    expect(
      result.repositoryMetadata.analysisTimestamp
    ).toBeDefined();
  });

  test("should detect JavaScript language", () => {
    expect(
      result.repositoryMetadata.languages
    ).toContain("JavaScript");
  });

  test("should detect package and dependency files", () => {
    expect(
      result.repositoryMetadata.importantFiles.dependencies
    ).toContain("package.json");

    expect(
      result.repositoryMetadata.importantFiles.dependencies
    ).toContain("package-lock.json");
  });

  test("should detect README file", () => {
    expect(
      result.repositoryMetadata.importantFiles.readme
    ).toContain("README.md");
  });

  test("should detect test files", () => {
    expect(
      result.repositoryMetadata.importantFiles.tests
    ).toContain("tests/contracts.test.js");

    expect(
      result.repositoryMetadata.importantFiles.tests
    ).toContain("tests/example.test.js");
  });

  test("should detect application entry point", () => {
    expect(
      result.repositoryMetadata.importantFiles.entryPoints
    ).toContain("src/index.js");
  });

  test("should detect Node.js runtime and dependencies", () => {
    expect(
      result.technologyAndDependencies.runtime.node
    ).toBe(">=20");

    expect(
      result.technologyAndDependencies.libraries.dependencies
    ).toHaveProperty("express");

    expect(
      result.technologyAndDependencies.libraries.devDependencies
    ).toHaveProperty("jest");
  });

  test("should return Not available when information cannot be established", () => {
    expect(
      result.systemPurpose.targetUsers
    ).toBe(NOT_AVAILABLE);

    expect(
      result.systemPurpose.businessDomain
    ).toBe(NOT_AVAILABLE);

    expect(
      result.architecture.overallArchitecture
    ).toBe(NOT_AVAILABLE);

    expect(
      result.apisAndInterfaces.endpoints
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "GET",
          path: "/",
          source: "src/index.js"
        }),
        expect.objectContaining({
          method: "GET",
          path: "/health",
          source: "src/index.js"
        })
      ])
    );

    expect(
      result.deployment.method
    ).toBe(NOT_AVAILABLE);
  });

  test("should detect configuration files", () => {
    expect(result.configuration.files).toEqual(
      expect.arrayContaining([
        "src/config.js"
      ])
    );
  });

  test("should detect environment variables from source files", () => {
    expect(result.configuration.environmentVariables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "PORT",
          source: "src/index.js"
        })
      ])
    );
  });

  test("should record ignored directories as skipped", () => {
    const skippedFiles = result.skipped.map(
      (item) => item.file
    );

    expect(skippedFiles).toContain(".git");
    expect(skippedFiles).toContain("node_modules");
    expect(skippedFiles).toContain("coverage");
  });
});
