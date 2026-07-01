# Context Pack: code_implementer

Read this pack first. Open full artifacts only when a necessary detail is missing.

## Story
- Key: PE-587
- Title: Reception Desk Module for GRE - View Records & Customer Check-In Management
- Description: Create production-grade Reception Desk APIs inside the existing Batch Manager module using NestJS, TypeORM, and MySQL. All APIs should be implemented inside `slot.controller.ts` and `slot.service.ts`. The Reception Desk module is for GRE users to manage live customer check-ins during Unit Allotment and Launch journeys. GRE users should only be able to view and operate on slots/batches having status `OPEN` or `ACTIVE`. Locked, future, completed, elapsed, or archived slots must not be visible. Required APIs: * Campaign batch listing API * Active/Open slot listing API * View records listing API * Batch dashboard summary API * Universal search API * Send OTP API * Verify OTP API * Resend OTP API * Attendance marking/check-in API * Attendance detail API View Records API should fetch mapped voucher/customer records using: * eoi_batch_slots * eoi_batch_vouchers * vouchers Listing should includ…

## Handoffs
### implementation_planner
{
  "acceptanceCriteria": [
    "### Visibility & access",
    "[ ] GRE-authenticated requests are enforced via role guards on all Reception Desk endpoints.",
    "[ ] Listings and searches return only batches/slots with status **`OPEN`** or **`ACTIVE`**.",
    "[ ] Locked, future, completed, elapsed, and archived slots never appear in GRE listings or search results.",
    "[ ] Attempts to check in or fetch detail for non-eligible slots return appropriate errors (4xx), not partial success."
  ],
  "contextPointers": [
    "docs/ai/context-map.json",
    "docs/ai/project-context.md (only relevant sections if needed)",
    "docs/ai/stories/PE-587/spec.md"
  ],
  "fullArtifacts": [
    "docs/ai/stories/PE-587/implementation-plan.md"
  ],
  "keyOutputs": [
    "Actionable implementation steps documented",
    "Target files identified for planned edits"
  ],
  "nextAgentHints": [
    "Read the handoff first. Open the full artifact only when needed for details.",
    "Implement the plan and inspect listed target files first.",
    "Keep edits scoped; avoid printing full file contents, full diffs, or large code blocks in chat."
  ],
  "primaryArtifact": "docs/ai/stories/PE-587/implementation-plan.md",
  "risks": [],
  "schemaVersion": 1,
  "status": "completed",
  "stepKey": "implementation_planner",
  "summary": "Implementation plan generated for code implementation.",
  "targetFiles": [
    "src/modules/eoi_manager/batch_manager/slot.controller.ts",
    "src/modules/eoi_manager/batch_manager/slot.service.ts",
    "src/modules/eoi_manager/batch_manager/entities/batch
[truncated]

### story_analyzer
{
  "acceptanceCriteria": [
    "### Visibility & access",
    "[ ] GRE-authenticated requests are enforced via role guards on all Reception Desk endpoints.",
    "[ ] Listings and searches return only batches/slots with status **`OPEN`** or **`ACTIVE`**.",
    "[ ] Locked, future, completed, elapsed, and archived slots never appear in GRE listings or search results.",
    "[ ] Attempts to check in or fetch detail for non-eligible slots return appropriate errors (4xx), not partial success."
  ],
  "contextPointers": [
    "docs/ai/context-map.json",
    "docs/ai/project-context.md (only relevant sections if needed)"
  ],
  "fullArtifacts": [
    "docs/ai/stories/PE-587/spec.md"
  ],
  "keyOutputs": [
    "Requirements captured from story title and description",
    "Acceptance criteria normalized in spec",
    "Open questions noted for downstream planning"
  ],
  "nextAgentHints": [
    "Read the handoff first. Open the full artifact only when needed for details.",
    "Use the spec to build an actionable implementation plan."
  ],
  "primaryArtifact": "docs/ai/stories/PE-587/spec.md",
  "risks": [],
  "schemaVersion": 1,
  "status": "completed",
  "stepKey": "story_analyzer",
  "summary": "Story spec generated and ready for implementation planning.",
  "targetFiles": [
    "docs/ai/stories/PE-587/spec.md"
  ]
}

## Target Files
- src/modules/eoi_manager/batch_manager/slot.controller.ts
- src/modules/eoi_manager/batch_manager/slot.service.ts
- src/modules/eoi_manager/batch_manager/entities/batch_voucher.entity.ts
- src/modules/eoi_manager/batch_manager/batch_manager.module.ts
- src/enums/event-messages.enum.ts
- src/modules/eoi_manager/batch_manager/dto/reception-desk.dto.ts
- src/migrations/<timestamp>-AddReceptionDeskAttendanceToBatchVouchers.ts
- src/modules/eoi_manager/batch_manager/slot.service.spec.ts
- src/modules/eoi_manager/batch_manager/allocation.service.ts
- src/modules/site_visit_logIn/site_visit_logIn.service.ts
- src/config/constants.ts
- src/enums/batch-manager.enums.ts
- src/helpers/dto/commonFindAll.dto.ts
- docs/ai/stories/PE-587/spec.md

## Selected Context Map
{
  "agentEntryPoints": {
    "codebaseAnalyzer": ".opencode/agents/codebase-analyzer.md",
    "contextMap": "docs/ai/context-map.json",
    "governance": ".opencode/agents/governance-agent.md",
    "projectContext": "docs/ai/project-context.md",
    "sdlcRules": ".opencode/agents/_sdlc-rules.md"
  },
  "schemaVersion": 1,
  "selectedEntries": {
    "api": {
      "globalPrefix": "api",
      "nonProdPrefixPattern": "api/{NODE_ENV}",
      "responseEnvelope": "success-response-errors",
      "style": "rest"
    },
    "commands": {
      "build": "npm run build",
      "dev": "npm run start:dev",
      "format": "npm run format",
      "lint": "npm run lint",
      "migrationCreate": "npm run migration:create -- src/migrations/<Name>",
      "migrationRevert": "npm run migration:revert",
      "migrationRun": "npm run migration:run",
      "prod": "npm run start:prod",
      "test": "npm run test",
      "testCov": "npm run test:cov",
      "testE2e": "npm run test:e2e"
    },
    "crossCutting": {
      "config": "src/config/",
      "constants": "src/config/constants.ts",
      "decryptGuard": "src/middleware/decryptRequest.middleware.ts",
      "exceptionFilter": "src/filters/global-exception.filter.ts",
      "logger": "src/logger/logger.ts",
      "responseInterceptor": "src/interceptors/transform.interceptor.ts",
      "roleFilterUtils": "src/utils/role-based-filter.utils.ts",
      "sanitizeMiddleware": "src/middleware/sanitize.middleware.ts",
      "validationPipe": "src/validations/custom-pipe.validation.ts"
    },
    "deeperDocs": [
      {
        "path": "README.md",
        "title": "README setup and conventions"
      },
      {
        "path": "docs/PE-483-bulk-transaction-api-flow.md",
        "title": "Bulk EOI transaction flow"
      }
    ],
    "repositoryRole": "backend-api-only",
    "testing": {
      "e2eConfig": "test/jest-e2e.json",
      "e2ePath": "test/",
      "jestConfig": "jest.config.js",
      "unitPattern": "src/**/*.spec.ts"
    }
  }
}

## Fallback Artifacts
- Story spec: docs/ai/stories/PE-587/spec.md
- Implementation plan: docs/ai/stories/PE-587/implementation-plan.md
- Project context: docs/ai/project-context.md
- Context map: docs/ai/context-map.json
