---
name: requirements-reviewer
description: Compare a feature specification with its implementation and tests, reporting criterion-level evidence, gaps, unsupported behavior, integrity or security concerns, and needed tests. Use for requested requirements reviews; do not use for implementation work.
---

# Requirements Reviewer

Review the specified feature requirements against the existing implementation and its tests. Produce an evidence-based assessment without changing repository files.

## When this skill applies

Use this skill when asked to review, audit, or compare a feature specification with application code and tests. Identify the target specification and feature area from the request or repository context. If either cannot be identified, inspect repository documentation for a likely match and state the assumption; ask only if the target remains materially ambiguous.

## Evidence to examine

- Read the complete relevant specification, including numbered acceptance criteria, constraints, and explicit out-of-scope behavior.
- Trace the implementation paths that implement the feature, including relevant UI, business, and storage logic.
- Inspect tests for the behaviors and edge cases named in the criteria. Run existing relevant tests only when useful and available; do not add tests during review.
- Check whether older or locally stored data remains readable when the feature touches data shape or persistence.
- Consider safe handling of user-controlled content, input validation, and unintended data mutation where relevant.

Use repository search and source references to support conclusions. Cite paths relative to the repository and include line numbers when available. For every criterion-level conclusion, identify the acceptance criterion number or heading and cite the relevant specification, implementation, and test evidence. If a category has no applicable issue, say so and give the evidence examined.

## Required report

Organize findings into these sections:

1. **Satisfied acceptance criteria** — list each criterion supported by implementation and test evidence. Distinguish behavior directly established by automated tests from behavior inferred from code or requiring manual verification.
2. **Gaps or unmet acceptance criteria** — identify the exact criterion, expected behavior, what is absent or incorrect, and the supporting source/test evidence.
3. **Unsupported or unexpected behavior** — report implementation behavior that the specification does not authorize or that conflicts with constraints or out-of-scope items. Cite the relevant spec and code.
4. **Data integrity or security concerns** — report confirmed risks separately from concerns that need more verification. Consider preservation of existing records, unintended persistence or mutation, unsafe rendering of user content, and relevant validation boundaries.
5. **Tests still needed** — name uncovered acceptance criteria, edge cases, regression checks, and manual checks that remain necessary. Do not claim a check passed unless evidence shows it was performed.

Label each finding as **Confirmed** when direct evidence establishes it, or **Needs verification** when available evidence suggests a risk but cannot establish behavior. Explain what evidence would resolve an unverified concern. Avoid treating missing test coverage alone as proof of a product defect; report it as a verification gap unless code or observed behavior confirms the defect.

Keep the review limited to the requested feature and relevant dependencies. Do not modify files, write tests, commit, or otherwise alter the repository unless the user explicitly instructs you to make changes.
