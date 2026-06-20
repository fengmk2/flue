---
title: Workflows
description: Create finite agent-backed operations from inline or reusable Actions.
lastReviewedAt: 2026-06-20
---

Workflows are finite, inspectable operations for background jobs, document transformations, reviews, and CI tasks. Every workflow binds one [Action](/docs/api/action-api/) to one agent definition. Use an [agent](/docs/guide/building-agents/) instead when work should continue across messages.

## Create a workflow

A file in `src/workflows/` defines a discovered workflow. Its filename becomes the workflow name, and its default export must be the value returned by `defineWorkflow()`:

```ts title="src/workflows/summarize.ts"
import { defineAgent, defineWorkflow } from '@flue/runtime';
import * as v from 'valibot';

export default defineWorkflow({
  agent: defineAgent(() => ({ model: 'anthropic/claude-haiku-4-5' })),
  input: v.object({ text: v.string() }),
  output: v.object({ summary: v.string() }),

  async run({ harness, input }) {
    const session = await harness.session();
    const response = await session.prompt(input.text);
    return { summary: response.text };
  },
});
```

This defines the `summarize` workflow. Each invocation validates the supplied text, asks the model to summarize it, and returns a validated `{ summary }` result. Use this pattern for finite work that should have its own run, result, and event history. See the [Workflow API](/docs/api/workflow-api/) for the complete definition contract.

## Reuse an Action

Use `defineAction()` when the same finite behavior should back multiple workflows or be callable by a model through an agent's `actions` list:

```ts title="src/actions/summarize.ts"
import { defineAction } from '@flue/runtime';
import * as v from 'valibot';

export const summarize = defineAction({
  name: 'summarize_document',
  description: 'Summarize a document clearly and concisely.',
  input: v.object({ text: v.string() }),
  output: v.object({ summary: v.string() }),

  async run({ harness, input }) {
    const response = await (await harness.session()).prompt(input.text);
    return { summary: response.text };
  },
});
```

Bind the extracted Action without repeating its schemas or handler:

```ts title="src/workflows/summarize.ts"
import { defineAgent, defineWorkflow } from '@flue/runtime';
import { summarize } from '../actions/summarize.ts';

const summarizer = defineAgent(() => ({
  model: 'anthropic/claude-haiku-4-5',
}));

export default defineWorkflow({ agent: summarizer, action: summarize });
```

Start inline when behavior belongs to one workflow. Extract an Action when another workflow or a model should call the same operation. See [`defineAction()`](/docs/api/action-api/#defineaction) and [`defineWorkflow()`](/docs/api/workflow-api/#defineworkflow) for their complete options.

## Invoke a workflow

### CLI

Run a discovered workflow locally without exposing HTTP:

```bash
pnpm exec flue run summarize --input '{"text":"Flue workflows complete finite operations."}'
```

`flue run` validates the JSON supplied to `--input`, reports run events, and prints the successful result as JSON. Its temporary child process does not publish run-inspection routes and its history disappears when the command exits.

### Application code

Use ambient `invoke()` from application-owned routes, channels, schedules, or other code executing inside a Flue-built server:

```ts
import { invoke } from '@flue/runtime';
import summarize from './workflows/summarize.ts';

const { runId } = await invoke(summarize, {
  input: { text: 'Summarize this document.' },
});
```

`invoke()` admits a real workflow run and returns its `runId` without waiting for completion. Import the exact default export of a discovered workflow module. Use `dispatch()` instead when input should continue one persistent Agent conversation.

### HTTP and SDK

HTTP invocation is opt-in. Export route middleware from the workflow module when callers should be able to start it through your Flue app:

```ts title="src/workflows/summarize.ts"
import type { WorkflowRouteHandler } from '@flue/runtime';

export const route: WorkflowRouteHandler = async (_c, next) => next();
```

Callers can then send the input JSON to `POST /workflows/summarize` or use `client.workflows.invoke('summarize', { input })`. Add `?wait=result` over HTTP, or `wait: 'result'` in the SDK, to wait for completion. Both forms return the `runId`; use it with an exposed run resource when you need events or metadata. Route-free workflows remain available to the CLI and ambient `invoke()`; see the [Workflow API HTTP exports](/docs/api/workflow-api/#http-exports) for middleware behavior.

## Use the workflow harness

The harness is ready when the Action starts. Use its default session for related operations and its filesystem or shell for workflow-controlled setup:

```ts
async run({ harness, input }) {
  await harness.fs.writeFile('document.md', input.document);
  const session = await harness.session();
  await session.prompt('Review document.md and write findings to review.md.');
  return { review: await harness.fs.readFile('review.md') };
}
```

A session can also run skills, delegate tasks, and produce schema-backed structured results. See [Agent API](/docs/api/agent-api/), [Skills](/docs/guide/skills/), [Subagents](/docs/guide/subagents/), and [Sandboxes](/docs/guide/sandboxes/).

## Inspect runs

Every invocation creates a workflow run with a unique `runId`. Export `runs` from a workflow module to expose its existing runs through `GET /runs/<runId>`, `GET /runs/<runId>?meta`, `client.runs`, and `flue logs`. Without that export, HTTP clients receive the same `404` as they would for an unknown run.

Run records can contain inputs, results, logs, and model activity. Authorize every exposed run request in `runs`; see [Routing](/docs/guide/routing/#exposing-agents-and-workflows) for an example. Server-side `listRuns()` and `getRun()` remain available independently for application-owned inspection routes. See the [Workflow lifecycle reference](/docs/api/workflow-api/#lifecycle) for persisted input and event behavior.
