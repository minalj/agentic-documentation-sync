const CONTRACT_VERSION = "1.0";

const AGENT_NAMES = Object.freeze([
  "template-reader",
  "repository-analyzer",
  "documentation-generator",
  "confluence-publisher"
]);

const STAGES = Object.freeze([
  "authorization",
  "template",
  "analysis",
  "generation",
  "review",
  "validation",
  "publishing"
]);

const REPOSITORY_OUTCOMES = Object.freeze([
  "Success",
  "Partial Success",
  "Skipped",
  "Failed"
]);

const REVIEW_DECISIONS = Object.freeze(["Pending", "Approved", "Rejected"]);
const PUBLISH_OPERATIONS = Object.freeze(["create", "update"]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

function validateExecutionContext(context) {
  const errors = [];

  if (!isPlainObject(context)) {
    return ["execution context must be an object"];
  }

  requiredString(context.executionId, "executionId", errors);
  requiredString(context.repository, "repository", errors);
  requiredString(context.stage, "stage", errors);
  requiredString(context.timestamp, "timestamp", errors);

  if (context.stage && !STAGES.includes(context.stage)) {
    errors.push(`stage must be one of: ${STAGES.join(", ")}`);
  }

  if (context.branchOrCommit !== undefined && typeof context.branchOrCommit !== "string") {
    errors.push("branchOrCommit must be a string when provided");
  }

  return errors;
}

function validateAgentMessage(message) {
  const errors = [];

  if (!isPlainObject(message)) {
    return ["agent message must be an object"];
  }

  if (message.contractVersion !== CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${CONTRACT_VERSION}`);
  }

  if (!AGENT_NAMES.includes(message.agent)) {
    errors.push(`agent must be one of: ${AGENT_NAMES.join(", ")}`);
  }

  errors.push(...validateExecutionContext(message.context));

  if (!isPlainObject(message.payload)) {
    errors.push("payload must be an object");
  }

  if (message.diagnostics !== undefined && !isPlainObject(message.diagnostics)) {
    errors.push("diagnostics must be an object when provided");
  }

  return errors;
}

function validateRepositoryMetadata(metadata) {
  const errors = [];

  if (!isPlainObject(metadata)) {
    return ["repository metadata must be an object"];
  }

  requiredString(metadata.name, "repository metadata name", errors);
  requiredString(metadata.url, "repository metadata url", errors);
  requiredString(metadata.analysisTimestamp, "repository metadata analysisTimestamp", errors);

  if (metadata.languages !== undefined && !Array.isArray(metadata.languages)) {
    errors.push("repository metadata languages must be an array when provided");
  }

  return errors;
}

function validateStageResult(result) {
  const errors = [];

  if (!isPlainObject(result)) {
    return ["stage result must be an object"];
  }

  errors.push(...validateExecutionContext(result.context));
  requiredString(result.status, "status", errors);
  requiredString(result.startedAt, "startedAt", errors);
  requiredString(result.completedAt, "completedAt", errors);

  if (!isPlainObject(result.data)) {
    errors.push("data must be an object");
  }

  if (result.warnings !== undefined && !Array.isArray(result.warnings)) {
    errors.push("warnings must be an array when provided");
  }

  return errors;
}

function validateValidationSummary(summary) {
  const errors = [];

  if (!isPlainObject(summary)) {
    return ["validation summary must be an object"];
  }

  if (typeof summary.valid !== "boolean") {
    errors.push("valid must be a boolean");
  }

  for (const field of ["requiredSections", "placeholders", "redaction", "unsupportedClaims", "formatCompatibility"]) {
    if (typeof summary[field] !== "boolean") {
      errors.push(`${field} must be a boolean`);
    }
  }

  if (summary.errors !== undefined && !Array.isArray(summary.errors)) {
    errors.push("errors must be an array when provided");
  }

  return errors;
}

function validateStatusReport(report) {
  const errors = [];

  if (!isPlainObject(report)) {
    return ["status report must be an object"];
  }

  errors.push(...validateExecutionContext(report.context));
  if (!REPOSITORY_OUTCOMES.includes(report.repositoryOutcome)) {
    errors.push(`repositoryOutcome must be one of: ${REPOSITORY_OUTCOMES.join(", ")}`);
  }

  for (const field of ["startedAt", "completedAt", "processingDuration"]) {
    requiredString(report[field], field, errors);
  }

  return errors;
}

function validateAuditEvent(event) {
  const errors = [];

  if (!isPlainObject(event)) {
    return ["audit event must be an object"];
  }

  errors.push(...validateExecutionContext(event.context));
  for (const field of ["identity", "action", "timestamp", "result"]) {
    requiredString(event[field], field, errors);
  }

  return errors;
}

function validateRetryRecord(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    return ["retry record must be an object"];
  }

  errors.push(...validateExecutionContext(record.context));
  requiredString(record.reason, "reason", errors);

  if (!Number.isInteger(record.attempt) || record.attempt < 1) {
    errors.push("attempt must be a positive integer");
  }

  if (record.transient !== true && record.transient !== false) {
    errors.push("transient must be a boolean");
  }

  return errors;
}

function validatePublishingResult(result) {
  const errors = [];

  if (!isPlainObject(result)) {
    return ["publishing result must be an object"];
  }

  errors.push(...validateExecutionContext(result.context));
  if (!PUBLISH_OPERATIONS.includes(result.operation)) {
    errors.push(`operation must be one of: ${PUBLISH_OPERATIONS.join(", ")}`);
  }
  requiredString(result.status, "status", errors);

  if (result.pageId !== undefined && typeof result.pageId !== "string") {
    errors.push("pageId must be a string when provided");
  }

  return errors;
}

function validateReviewDecision(decision) {
  const errors = [];

  if (!isPlainObject(decision)) {
    return ["review decision must be an object"];
  }

  errors.push(...validateExecutionContext(decision.context));
  requiredString(decision.reviewerIdentity, "reviewerIdentity", errors);
  requiredString(decision.timestamp, "timestamp", errors);

  if (!REVIEW_DECISIONS.includes(decision.decision)) {
    errors.push(`decision must be one of: ${REVIEW_DECISIONS.join(", ")}`);
  }

  return errors;
}

function assertValid(validate, value) {
  const errors = validate(value);
  if (errors.length > 0) {
    throw new TypeError(errors.join("; "));
  }
  return true;
}

module.exports = {
  AGENT_NAMES,
  CONTRACT_VERSION,
  PUBLISH_OPERATIONS,
  REPOSITORY_OUTCOMES,
  REVIEW_DECISIONS,
  STAGES,
  assertValid,
  validateAgentMessage,
  validateAuditEvent,
  validateExecutionContext,
  validatePublishingResult,
  validateRepositoryMetadata,
  validateRepositoryOutcome: (outcome) =>
    REPOSITORY_OUTCOMES.includes(outcome) ? [] : [`repository outcome must be one of: ${REPOSITORY_OUTCOMES.join(", ")}`],
  validateRetryRecord,
  validateReviewDecision,
  validateStageResult,
  validateStatusReport,
  validateValidationSummary
};
