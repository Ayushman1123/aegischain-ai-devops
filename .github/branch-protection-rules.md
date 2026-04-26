# Branch Protection Rules

This document defines recommended branch protection configuration for development and main branches.

## Development branch rules

Scope:
- Branch name pattern: development

Protection settings:
- Require a pull request before merging: enabled
- Required approving reviews: 1
- Dismiss stale pull request approvals when new commits are pushed: enabled
- Require conversation resolution before merging: enabled
- Require status checks to pass before merging: enabled
- Require branches to be up to date before merging: enabled
- Restrict who can push: enabled (maintainers only)
- Allow force pushes: disabled
- Allow deletions: disabled

Required status checks:
- Orchestration Check / orchestration-check
- IaC Checks / bicep-check
- IaC Checks / terraform-check

## Main branch rules

Scope:
- Branch name pattern: main

Protection settings:
- Require a pull request before merging: enabled
- Required approving reviews: 2
- Require review from code owners: enabled
- Dismiss stale pull request approvals when new commits are pushed: enabled
- Require conversation resolution before merging: enabled
- Require status checks to pass before merging: enabled
- Require branches to be up to date before merging: enabled
- Restrict who can push: enabled (release maintainers only)
- Allow force pushes: disabled
- Allow deletions: disabled

Required status checks:
- Orchestration Check / orchestration-check
- IaC Checks / bicep-check
- IaC Checks / terraform-check

## Notes on deployment workflows

The Azure deployment workflow is manual and environment-gated, so it is not intended to be a required merge check.

Relevant controls already configured:
- Development and production environment selection in the deploy workflow
- Concurrency lock for production deploy runs
- Production apply blocked when not running from main branch
