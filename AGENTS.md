# AGENTS.md

## Project Overview

This project is an AI Game Hero Design Assistant.

It includes:

- A FastAPI backend for hero design generation, VFX prompt generation, image prompt generation, project saving, and project export.
- An Electron desktop frontend for interacting with hero generation, visual assets, project management, and export workflows.
- A planned Playable Demo module that will transform generated hero designs into structured playable configuration and later run them in a fixed 3D training scene.

The project language for user-facing explanations is primarily Chinese. Code comments and technical names may use English when appropriate.

## Existing Completed Features

The following features already exist and should not be reimplemented unless explicitly requested:

- Hero design generation.
- VFX prompt generation.
- Image prompt generation.
- LLM Provider switching between fake, openai, and openai_compatible.
- FakeLLM for tests and local workflows.
- Project save flow.
- Project export package flow.
- Electron desktop UI.
- Activity Bar + single-page workspace UI.
- ZIP export download through Electron IPC.
- Top menu view switching.
- HeroPlayableSpec v1 protocol documentation.
- Backend Pydantic schema for HeroPlayableSpec.

## Core Development Rules

Follow these rules for all future work:

1. Use modular development.
2. Use TDD for new functional modules.
3. Keep task scope small and explicit.
4. Only modify files that are necessary for the current task.
5. Do not rewrite working features.
6. Do not refactor unrelated modules.
7. Do not introduce new dependencies unless explicitly requested.
8. Do not remove existing tests to make new tests pass.
9. Do not skip failing tests unless explicitly instructed.
10. Preserve existing loading, success, error, and empty states in the desktop UI.
11. Always report changed files and test results after completing a task.

## Scope Control

For each task:

- If the task is backend-only, do not modify desktop files.
- If the task is desktop-only, do not modify backend files.
- If the task is documentation-only, do not modify source code.
- Do not add API routes unless the task explicitly asks for API routes.
- Do not connect LLM calls unless the task explicitly asks for LLM integration.
- Do not modify project save or export flows unless the task is specifically about save/export.
- Do not develop Three.js rendering before Game Core and Skill System are complete.
- Do not develop a Playtest page before the playable config validation and Game Core are complete.

## Playable Demo Development Plan

The Playable Demo module should be developed in stages:

1. HeroPlayableSpec v1 protocol documentation.
2. Backend Pydantic schema and pytest validation.
3. Desktop/frontend HeroPlayableSpec validation and normalization.
4. Game Core pure logic module.
5. Skill System.
6. Fixed training map.
7. Three.js renderer.
8. Playtest page.
9. Export integration.

Each stage should be implemented and tested independently.

## HeroPlayableSpec Principles

HeroPlayableSpec is the structured JSON protocol for playable hero demos.

Important principles:

- AI generates configuration, not executable game code.
- The client runtime executes safe structured fields only.
- The client must never execute eval, Function, remote code, or arbitrary scripts from generated data.
- Backend must validate generated specs with Pydantic.
- Desktop/frontend must validate specs again before runtime use.
- Invalid specs should be rejected or safely handled.
- Unknown fields should be ignored or logged, not executed.

Reference files:

- docs/playable/HeroPlayableSpec.v1.md
- docs/playable/HeroPlayableSpec.example.json
- backend/app/schemas/playable_schema.py
- backend/tests/test_playable_schema.py

## Backend Rules

For backend work:

- Follow the existing FastAPI project structure.
- Use Pydantic according to the project's current version and style.
- Use pytest for tests.
- Keep FakeLLM-based tests working without requiring real API keys.
- Do not require OpenAI API credentials for normal test runs.
- Do not break existing hero, VFX, image prompt, project save, or export endpoints.
- New schema-only work should not register routes in main.py.
- New API routes should be added only when explicitly requested.

Backend test command usually starts from:

```bash
cd backend
python -m pytest
```
