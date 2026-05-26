#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
from pathlib import Path

# Force UTF-8 output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Load the updated radicals mapping
with open("data/radicals_korean.json", "r", encoding="utf-8") as f:
    data = json.load(f)
    radicals = data.get("radicals", {})

# Check for specific characters
test_chars = ["与", "之", "以", "哦", "啦", "于", "如", "头", "疼"]

print("Checking test characters:")
for char in test_chars:
    if char in radicals:
        print(f"  {char}: {radicals[char]}")
    else:
        print(f"  {char}: NOT FOUND")

print(f"\nTotal mappings: {len(radicals)}")
print(f"\nFirst 20 radical characters: {list(radicals.keys())[:20]}")

# Check what the radical is for "与"
import json
with open("makemeahanzi/dictionary.txt", "r", encoding="utf-8") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("character") == "与":
                print(f"\n'与' entry from MMH:")
                print(f"  Radical: {entry.get('radical')}")
                print(f"  Character: {entry.get('character')}")
                break
        except:
            pass
