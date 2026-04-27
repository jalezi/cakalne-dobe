<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

# General Coding Behavior

Apply these rules for all coding tasks:

- Think before coding: state assumptions explicitly, surface tradeoffs, and ask when something material is unclear.
- Simplicity first: write the minimum code that solves the request and avoid speculative abstractions.
- Surgical changes: touch only the code required for the task and do not clean up unrelated areas.
- Goal-driven execution: define a concrete verification step and use it to confirm the change works.

[`CLAUDE.md`](./CLAUDE.md) is the fuller rationale and reference for these rules; this file contains the operative version that agents should follow.

