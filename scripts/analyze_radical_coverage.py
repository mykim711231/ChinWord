#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Load radicals mapping
with open("data/radicals_korean.json", "r", encoding="utf-8") as f:
    data = json.load(f)
    radicals = data.get("radicals", {})

# Load HSK words to see which radicals are actually used
with open("app/src/data/hsk-words.json", "r", encoding="utf-8") as f:
    words = json.load(f)

# Count radicals actually used in HSK words (6-9급)
adv_words = [w for w in words if w["hskLevel"] >= 6]
used_radicals = {}

for word in adv_words:
    rad = word.get("radical", "")
    if rad:
        if rad not in used_radicals:
            used_radicals[rad] = 0
        used_radicals[rad] += 1

print(f"Total unique radicals in HSK 6-9급: {len(used_radicals)}")
print(f"Total radical mappings in data: {len(radicals)}")

# Check coverage
mapped = 0
unmapped = 0
placeholder = 0

for rad, count in used_radicals.items():
    if rad in radicals:
        mapping = radicals[rad]
        if "(부수," in mapping:
            placeholder += count
        else:
            mapped += count

total_words = len(adv_words)
print(f"\nCoverage in HSK 6-9급 ({total_words} words):")
print(f"  With Korean names: {mapped} words ({100*mapped/total_words:.1f}%)")
print(f"  With placeholder names: {placeholder} words ({100*placeholder/total_words:.1f}%)")
print(f"  Unknown radicals: {total_words - mapped - placeholder} words")

# List unmapped radicals with usage count
print(f"\nUnmapped/placeholder radicals (used in HSK 6-9급):")
unmapped_list = []
for rad in sorted(used_radicals.keys()):
    if rad in radicals:
        mapping = radicals[rad]
        if "(부수," in mapping:
            unmapped_list.append((rad, used_radicals[rad], mapping))
    else:
        unmapped_list.append((rad, used_radicals[rad], "NOT IN MAP"))

# Show top 20 by frequency
unmapped_list.sort(key=lambda x: x[1], reverse=True)
for rad, count, mapping in unmapped_list[:20]:
    print(f"  {rad}: {count} words - {mapping}")
