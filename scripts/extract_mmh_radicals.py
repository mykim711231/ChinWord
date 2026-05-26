#!/usr/bin/env python3
"""Extract radical data from Make Me a Hanzi and map to Korean names."""

import json
from pathlib import Path
from collections import defaultdict

# Standard radical-to-Korean mapping based on HSK and common references
RADICAL_KOREAN_MAP = {
    # Single-stroke radicals
    "一": "한 일",
    "丨": "세로 곤",
    "丶": "점 주",
    "丿": "삐침 삐",
    "乙": "을 을",
    "亅": "버티는선 곤",

    # Common radicals from HSK
    "人": "사람 인",
    "儿": "어린사람 아",
    "入": "들어갈 입",
    "力": "힘 력",
    "冂": "둘러싸는틀 공",
    "几": "책상 궤",
    "凵": "움푹한곳 광",
    "刀": "칼 도",
    "刂": "칼 도",
    "十": "열 십",
    "卜": "점칠 복",
    "卩": "인장 절",
    "己": "나 기",
    "巛": "내 천",
    "巜": "내 천",
    "巨": "클 거",
    "口": "입 구",
    "囗": "둘러싼틀 위",
    "囗": "둘러싼틀 위",

    # Water radical
    "水": "물 수",
    "氵": "물 수",
    "氶": "물 수",
    "氺": "물 수",

    # Fire radical
    "火": "불 화",
    "灬": "불 화",

    # Wood radical
    "木": "나무 목",

    # Metal radical
    "金": "쇠 금",
    "钅": "쇠 금",

    # Earth radical
    "土": "흙 토",

    # Heart radical
    "心": "마음 심",
    "忄": "마음 심",

    # Hand radical
    "手": "손 수",
    "扌": "손 수",

    # Mouth radical
    "口": "입 구",

    # Foot radical
    "足": "발 족",
    "⻶": "발 족",

    # Eye radical
    "目": "눈 목",

    # Grass radical
    "艸": "풀 초",
    "⺾": "풀 초",

    # Mountain radical
    "山": "산 산",

    # Walk radical
    "辶": "걸을 착",
    "⻍": "걸을 착",

    # Person radical
    "亻": "사람 인",

    # Many more...
}

def extract_mmh_radicals():
    """Extract radical information from Make Me a Hanzi dictionary."""
    mmh_path = Path("makemeahanzi/dictionary.txt")

    radical_count = defaultdict(int)
    radical_examples = defaultdict(list)

    count = 0
    with open(mmh_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                char = entry.get("character", "")
                radical = entry.get("radical", "")

                if char and radical:
                    radical_count[radical] += 1
                    if len(radical_examples[radical]) < 3:
                        radical_examples[radical].append(char)

                count += 1
                if count % 10000 == 0:
                    print(f"[OK] Processed {count} entries...")
            except json.JSONDecodeError:
                continue

    print(f"\n[OK] Total entries: {count}")
    print(f"[OK] Unique radicals found: {len(radical_count)}")

    return radical_count, radical_examples

def build_comprehensive_map(radical_count, radical_examples):
    """Build comprehensive radical-to-Korean mapping."""
    comprehensive = {}

    # Start with our predefined mappings
    comprehensive.update(RADICAL_KOREAN_MAP)

    # Add any MMH radicals not yet mapped (with placeholder)
    for radical in sorted(radical_count.keys()):
        if radical not in comprehensive:
            examples = ", ".join(radical_examples[radical])
            count = radical_count[radical]
            # Use the radical itself as placeholder with count
            comprehensive[radical] = f"{radical} (부수, {count}자)"

    return comprehensive

def update_radicals_json(comprehensive_map):
    """Update the radicals_korean.json file with new mappings."""
    output_file = Path("data/radicals_korean.json")
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Load existing data
    existing = {}
    if output_file.exists():
        with open(output_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            existing = data.get("radicals", {})

    # Merge: new MMH data takes precedence
    existing.update(comprehensive_map)

    # Write updated data
    output_data = {
        "radicals": existing,
        "source": "Make Me a Hanzi (makemeahanzi) + manual mappings",
        "total_mapped": len(existing)
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] Updated {output_file}")
    print(f"[OK] Total radical mappings: {len(existing)}")

def main():
    print("Extracting radical data from Make Me a Hanzi...\n")

    radical_count, radical_examples = extract_mmh_radicals()

    print("\n[OK] Building comprehensive radical map...")
    comprehensive = build_comprehensive_map(radical_count, radical_examples)

    print(f"[OK] Comprehensive map size: {len(comprehensive)}")

    print("\n[OK] Updating radicals_korean.json...")
    update_radicals_json(comprehensive)

    print("\n[DONE] Radical extraction and mapping complete")

if __name__ == "__main__":
    main()
