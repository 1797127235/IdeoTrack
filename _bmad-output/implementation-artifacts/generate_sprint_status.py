#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate sprint-status.yaml from epics.md for IdeoTrack."""

import re
import os
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypinyin import lazy_pinyin
except ImportError:
    raise RuntimeError("pypinyin is required to convert Chinese story titles to kebab-case keys")


def to_kebab(title: str) -> str:
    """Convert a Chinese title to ASCII kebab-case using pinyin."""
    # Remove common punctuation and special chars
    cleaned = re.sub(r'[\/：，、；？！""''（）【】《》]', ' ', title)
    cleaned = re.sub(r'[^\w\s-]', '', cleaned)
    # Convert to pinyin
    pinyin_parts = lazy_pinyin(cleaned)
    pinyin_text = ' '.join(pinyin_parts)
    # Normalize to kebab-case
    pinyin_text = re.sub(r'[-\s]+', '-', pinyin_text.strip())
    pinyin_text = pinyin_text.lower().strip('-')
    # Deduplicate hyphens
    pinyin_text = re.sub(r'-+', '-', pinyin_text)
    return pinyin_text or 'story'


def parse_epics(epics_path: Path):
    content = epics_path.read_text(encoding='utf-8')
    # Regex for epic headers: ## Epic 1：标题
    epic_pattern = re.compile(r'^##\s+Epic\s+(\d+)\s*[:：]\s*(.+)$', re.MULTILINE)
    # Regex for story headers: ### Story 1.1：标题
    story_pattern = re.compile(r'^###\s+Story\s+(\d+)\.(\d+)\s*[:：]\s*(.+)$', re.MULTILINE)

    epics = []
    for m in epic_pattern.finditer(content):
        epics.append({
            'num': int(m.group(1)),
            'title': m.group(2).strip(),
            'start': m.start(),
            'stories': []
        })

    # Sort epics by position
    epics.sort(key=lambda e: e['start'])

    # Assign stories to epics based on position
    for m in story_pattern.finditer(content):
        epic_num = int(m.group(1))
        story_num = int(m.group(2))
        title = m.group(3).strip()
        for epic in epics:
            if epic['num'] == epic_num:
                epic['stories'].append({
                    'num': story_num,
                    'title': title,
                    'key': f"{epic_num}-{story_num}-{to_kebab(title)}"
                })
                break

    return epics


def generate_yaml(epics, project_name, project_key, tracking_system, story_location, now):
    lines = []
    lines.append(f"# generated: {now}")
    lines.append(f"# last_updated: {now}")
    lines.append(f"# project: {project_name}")
    lines.append(f"# project_key: {project_key}")
    lines.append(f"# tracking_system: {tracking_system}")
    lines.append(f"# story_location: '{story_location}'")
    lines.append("")
    lines.append("# STATUS DEFINITIONS:")
    lines.append("# ==================")
    lines.append("# Epic Status:")
    lines.append("#   - backlog: Epic not yet started")
    lines.append("#   - in-progress: Epic actively being worked on")
    lines.append("#   - done: All stories in epic completed")
    lines.append("#")
    lines.append("# Epic Status Transitions:")
    lines.append("#   - backlog -> in-progress: Automatically when first story is created (via create-story)")
    lines.append("#   - in-progress -> done: Manually when all stories reach 'done' status")
    lines.append("#")
    lines.append("# Story Status:")
    lines.append("#   - backlog: Story only exists in epic file")
    lines.append("#   - ready-for-dev: Story file created in stories folder")
    lines.append("#   - in-progress: Developer actively working on implementation")
    lines.append("#   - review: Ready for code review (via Dev's code-review workflow)")
    lines.append("#   - done: Story completed")
    lines.append("#")
    lines.append("# Retrospective Status:")
    lines.append("#   - optional: Can be completed but not required")
    lines.append("#   - done: Retrospective has been completed")
    lines.append("#")
    lines.append("# Action Item Status:")
    lines.append("#   - open: Committed during a retrospective, not yet addressed")
    lines.append("#   - in-progress: Actively being worked on")
    lines.append("#   - done: Completed")
    lines.append("#")
    lines.append("# WORKFLOW NOTES:")
    lines.append("# ===============")
    lines.append("# - Epic transitions to 'in-progress' automatically when first story is created")
    lines.append("# - Stories can be worked in parallel if team capacity allows")
    lines.append("# - Developer typically creates next story after previous one is 'done' to incorporate learnings")
    lines.append("# - Dev moves story to 'review', then runs code-review (fresh context, different LLM recommended)")
    lines.append("# - Retrospective appends its action items to action_items; sprint-status surfaces open ones")
    lines.append("")
    lines.append(f"generated: '{now}'")
    lines.append(f"last_updated: '{now}'")
    lines.append(f"project: {project_name}")
    lines.append(f"project_key: {project_key}")
    lines.append(f"tracking_system: {tracking_system}")
    lines.append(f"story_location: '{story_location}'")
    lines.append("")
    lines.append("development_status:")
    lines.append("  # All epics, stories, and retrospectives in order")

    for epic in epics:
        epic_key = f"epic-{epic['num']}"
        lines.append(f"  {epic_key}: backlog")
        for story in sorted(epic['stories'], key=lambda s: s['num']):
            lines.append(f"  {story['key']}: backlog")
        lines.append(f"  epic-{epic['num']}-retrospective: optional")

    return "\n".join(lines) + "\n"


def main():
    project_root = Path("E:/MyHub/IdeoTrack")
    epics_path = project_root / "_bmad-output/planning-artifacts/epics/epics-IdeoTrack-2026-06-22/epics.md"
    status_file = project_root / "_bmad-output/implementation-artifacts/sprint-status.yaml"

    epics = parse_epics(epics_path)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    project_name = "IdeoTrack"
    project_key = "NOKEY"
    tracking_system = "file-system"
    story_location = "{project-root}/_bmad-output/implementation-artifacts"

    yaml_content = generate_yaml(
        epics, project_name, project_key, tracking_system, story_location, now
    )

    status_file.parent.mkdir(parents=True, exist_ok=True)
    status_file.write_text(yaml_content, encoding='utf-8')

    total_stories = sum(len(e['stories']) for e in epics)
    print(f"Generated {status_file}")
    print(f"Total epics: {len(epics)}")
    print(f"Total stories: {total_stories}")


if __name__ == "__main__":
    main()
