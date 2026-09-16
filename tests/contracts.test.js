const {
  CONTRACT_VERSION,
  assertValid,
  validateAgentMessage,
  validateExecutionContext,
  validatePublishingResult,
  validateRepositoryOutcome,
  validateValidationSummary
} = require("../src/contracts");

const context = {
  executionId: "exec-123",
  repository: "org/example",
  branchOrCommit: "main",
  stage: "analysis",
  timestamp: "2026-09-14T10:00:00.000Z"
};

describe("shared contracts", () => {
  test("accepts a valid execution context", () => {
    expect(validateExecutionContext(context)).toEqual([]);
  });

  test("rejects an unsupported stage", () => {
    expect(validateExecutionContext({ ...context, stage: "unknown" })).toContain(
      "stage must be one of: authorization, template, analysis, generation, review, validation, publishing"
    );
  });

  test("accepts a valid versioned agent message", () => {
    expect(
      validateAgentMessage({
        contractVersion: CONTRACT_VERSION,
        agent: "repository-analyzer",
        context,
        payload: { findings: [] },
        diagnostics: { warnings: [] }
      })
    ).toEqual([]);
  });

  test("rejects malformed or unsupported agent messages", () => {
    const errors = validateAgentMessage({
      contractVersion: "0.1",
      agent: "unknown-agent",
      context,
      payload: []
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "contractVersion must be 1.0",
        "agent must be one of: template-reader, repository-analyzer, documentation-generator, confluence-publisher",
        "payload must be an object"
      ])
    );
  });

  test("accepts only defined repository outcomes", () => {
    expect(validateRepositoryOutcome("Partial Success")).toEqual([]);
    expect(validateRepositoryOutcome("Unsupported")).not.toEqual([]);
  });

  test("validates documentation and publishing contracts", () => {
    expect(
      validateValidationSummary({
        valid: true,
        requiredSections: true,
        placeholders: true,
        redaction: true,
        unsupportedClaims: true,
        formatCompatibility: true,
        errors: []
      })
    ).toEqual([]);

    expect(
      validatePublishingResult({
        context: { ...context, stage: "publishing" },
        operation: "update",
        pageId: "page-123",
        status: "Success"
      })
    ).toEqual([]);
  });

  test("assertValid throws a useful validation error", () => {
    expect(() => assertValid(validateExecutionContext, { stage: "analysis" })).toThrow(
      "executionId must be a non-empty string"
    );
  });
});
