---
title: Workflows
description: Export finite, typed jobs that follow a controlled path from input to output.
---

A workflow is a bounded invocation surface for orchestration that returns a result and can be inspected as a run.

## Define a workflow

```ts
export async function run({ init, payload }: FlueContext) {
  const harness = await init(agent);
  const session = await harness.session();
  return session.prompt(`Handle ${payload.task}.`);
}
```

Use workflows for automated jobs, CI actions, and request paths that need clear completion semantics.
