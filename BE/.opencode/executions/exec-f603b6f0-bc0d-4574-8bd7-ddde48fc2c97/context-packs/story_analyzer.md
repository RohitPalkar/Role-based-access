# Context Pack: story_analyzer

Read this pack first. Open full artifacts only when a necessary detail is missing.

## Story
- Key: PE-587
- Title: Reception Desk Module for GRE - View Records & Customer Check-In Management
- Description: Create production-grade Reception Desk APIs inside the existing Batch Manager module using NestJS, TypeORM, and MySQL. All APIs should be implemented inside `slot.controller.ts` and `slot.service.ts`. The Reception Desk module is for GRE users to manage live customer check-ins during Unit Allotment and Launch journeys. GRE users should only be able to view and operate on slots/batches having status `OPEN` or `ACTIVE`. Locked, future, completed, elapsed, or archived slots must not be visible. Required APIs: * Campaign batch listing API * Active/Open slot listing API * View records listing API * Batch dashboard summary API * Universal search API * Send OTP API * Verify OTP API * Resend OTP API * Attendance marking/check-in API * Attendance detail API View Records API should fetch mapped voucher/customer records using: * eoi_batch_slots * eoi_batch_vouchers * vouchers Listing should includ…

## Handoffs
None for this stage.

## Target Files
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
    "repositoryRole": "backend-api-only"
  }
}

## Fallback Artifacts
- Story spec: docs/ai/stories/PE-587/spec.md
- Implementation plan: docs/ai/stories/PE-587/implementation-plan.md
- Project context: docs/ai/project-context.md
- Context map: docs/ai/context-map.json
