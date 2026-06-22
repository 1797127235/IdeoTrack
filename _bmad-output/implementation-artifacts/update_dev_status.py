#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Update sprint-status.yaml for dev-story in-progress."""

from datetime import datetime, timezone

path = '_bmad-output/implementation-artifacts/sprint-status.yaml'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

lines = content.split('\n')
new_lines = []
in_dev_status = False
for line in lines:
    if line.startswith('last_updated:'):
        new_lines.append(f"last_updated: '{now}'")
        continue
    if line.startswith('development_status:'):
        in_dev_status = True
        new_lines.append(line)
        continue
    if in_dev_status:
        stripped = line.strip()
        if stripped.startswith('1-1-xue-hao-gong-hao-mi-ma-deng-lu:'):
            new_lines.append('  1-1-xue-hao-gong-hao-mi-ma-deng-lu: in-progress')
            continue
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print('Updated sprint-status.yaml')
print('1-1-xue-hao-gong-hao-mi-ma-deng-lu: in-progress')
