# Context Pack: auto_fixer

Read this pack first. Open full artifacts only when a necessary detail is missing.

## Story
- Key: PE-587
- Title: Reception Desk Module for GRE - View Records & Customer Check-In Management
- Description: Create production-grade Reception Desk APIs inside the existing Batch Manager module using NestJS, TypeORM, and MySQL. All APIs should be implemented inside `slot.controller.ts` and `slot.service.ts`. The Reception Desk module is for GRE users to manage live customer check-ins during Unit Allotment and Launch journeys. GRE users should only be able to view and operate on slots/batches having status `OPEN` or `ACTIVE`. Locked, future, completed, elapsed, or archived slots must not be visible. Required APIs: * Campaign batch listing API * Active/Open slot listing API * View records listing API * Batch dashboard summary API * Universal search API * Send OTP API * Verify OTP API * Resend OTP API * Attendance marking/check-in API * Attendance detail API View Records API should fetch mapped voucher/customer records using: * eoi_batch_slots * eoi_batch_vouchers * vouchers Listing should includ…

## Handoffs
### ai_reviewer
{
  "acceptanceCriteria": [],
  "contextPointers": [],
  "fullArtifacts": [
    ".opencode/executions/exec-f603b6f0-bc0d-4574-8bd7-ddde48fc2c97/review-pointers-cycle-1.md"
  ],
  "keyOutputs": [
    "R5",
    "R1",
    "R2",
    "R3",
    "R4",
    "R6"
  ],
  "nextAgentHints": [
    "Read the handoff first. Open the full artifact only when needed for details.",
    "Auto-fixer should address reviewer IDs only."
  ],
  "primaryArtifact": ".opencode/executions/exec-f603b6f0-bc0d-4574-8bd7-ddde48fc2c97/review-pointers-cycle-1.md",
  "risks": [],
  "schemaVersion": 1,
  "status": "completed",
  "stepKey": "ai_reviewer",
  "summary": "AI review completed. Findings captured.",
  "targetFiles": [
    "batch-slots/reception-desk/...",
    "src/modules/eoi_manager/batch_manager/slot.controller.ts",
    "src/modules/eoi_manager/batch_manager/slot.service.ts",
    "src/modules/eoi_manager/batch_manager/entities/batch_voucher.entity.ts",
    "src/modules/eoi_manager/batch_manager/batch_manager.module.ts",
    "src/enums/event-messages.enum.ts",
    "src/modules/eoi_manager/batch_manager/dto/reception-desk.dto.ts",
    "src/migrations/<timestamp>-AddReceptionDeskAttendanceToBatchVouchers.ts",
    "src/modules/eoi_manager/batch_manager/slot.service.spec.ts",
    "src/modules/eoi_manager/batch_manager/allocation.service.ts"
  ]
}
### regression_reviewer
{
  "missing": true
}
### fix_planner
{
  "missing": true
}
### comment_analyzer
{
  "missing": true
}

## Target Files
- batch-slots/reception-desk/...
- src/modules/eoi_manager/batch_manager/slot.controller.ts
- src/modules/eoi_manager/batch_manager/slot.service.ts
- src/modules/eoi_manager/batch_manager/entities/batch_voucher.entity.ts
- src/modules/eoi_manager/batch_manager/batch_manager.module.ts
- src/enums/event-messages.enum.ts
- src/modules/eoi_manager/batch_manager/dto/reception-desk.dto.ts
- src/migrations/<timestamp>-AddReceptionDeskAttendanceToBatchVouchers.ts
- src/modules/eoi_manager/batch_manager/slot.service.spec.ts
- src/modules/eoi_manager/batch_manager/allocation.service.ts

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
