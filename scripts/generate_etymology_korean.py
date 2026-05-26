#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate etymology with complete Korean definitions."""

import json
import sys
from pathlib import Path
from english_to_korean_mappings import translate_definition, ENGLISH_TO_KOREAN

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def load_hsk_data():
    """Load HSK words data."""
    with open("app/src/data/hsk-words.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_radical_map():
    """Load radical Korean names."""
    with open("data/radicals_korean.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("radicals", {})

def load_mmh_data():
    """Load Make Me a Hanzi character data."""
    mmh_map = {}
    with open("makemeahanzi/dictionary.txt", "r", encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                char = entry.get("character", "")
                if char:
                    mmh_map[char] = {
                        "decomposition": entry.get("decomposition", ""),
                        "definition": entry.get("definition", ""),
                        "radical": entry.get("radical", ""),
                    }
            except:
                continue
    print(f"[OK] Loaded {len(mmh_map)} characters from Make Me a Hanzi\n")
    return mmh_map

def get_pos_korean(pos_list):
    """Convert POS tags to Korean."""
    pos_mapping = {
        "n": "명사", "v": "동사", "a": "형용사", "ad": "형용사성부사",
        "d": "부사", "p": "전치사", "c": "접속사", "cc": "접속사",
        "u": "조사", "r": "대명사", "y": "감탄사",
        "nr": "인명", "ns": "지명", "nt": "기관명", "nz": "기타명사",
        "m": "수사", "mq": "수량사", "q": "양사", "qt": "시간양사", "qv": "동량사",
        "an": "명사성형용사", "t": "시간명사", "tg": "시간명사",
        "f": "방위사", "x": "보조동사", "o": "의성어", "e": "의태어",
        "b": "수식언", "g": "기타", "h": "전감사", "k": "용언접미사",
        "l": "명사접미사", "s": "처소사", "z": "문법단위",
        "vn": "동명사", "Mg": "외국어", "Rg": "고유명사",
    }
    korean_pos = [pos_mapping.get(p, p) for p in pos_list if p]
    korean_pos = list(dict.fromkeys(korean_pos))
    return "/".join(korean_pos) if korean_pos else "기타"

def convert_to_korean(english_text):
    """Convert English definition to Korean."""
    if not english_text or english_text == "？":
        return "(부수 분석 진행 중)"

    # Split by semicolons and convert each part
    parts = english_text.split(";")
    korean_parts = []

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Try to translate the part
        for eng, kor in ENGLISH_TO_KOREAN.items():
            if eng in part.lower():
                korean_parts.append(kor)
                break
        else:
            # No match found, keep first 10 chars of English
            if len(part) > 15:
                korean_parts.append(part[:12] + "...")
            else:
                korean_parts.append(part)

    if korean_parts:
        return " ".join(korean_parts[:2])  # Take first 2 parts max
    else:
        return english_text[:15] if len(english_text) > 15 else english_text

def format_component(char, mmh_map, radical_map):
    """Format a single component with its Korean name."""
    # Skip decomposition operators
    if char in "⿰⿱⿳⿲⿴⿵⿶⿷⿸⿹⿺⿻？":
        return None

    if char in radical_map:
        korean_name = radical_map[char]
        # Clean up placeholder text
        if "(부수," in korean_name:
            # Try to get definition and convert
            if char in mmh_map and mmh_map[char].get("definition"):
                definition = mmh_map[char]["definition"]
                korean_def = convert_to_korean(definition)
                return f"{char}({korean_def})"
            else:
                return f"{char}(부수 분석 진행 중)"
        return f"{char}({korean_name})"
    elif char in mmh_map and mmh_map[char].get("definition"):
        definition = mmh_map[char]["definition"]
        korean_def = convert_to_korean(definition)
        return f"{char}({korean_def})"
    else:
        return f"{char}(부수 분석 진행 중)"

def parse_decomposition(decomposition_str, mmh_map, radical_map):
    """Parse decomposition and format nicely."""
    if not decomposition_str or decomposition_str == "？":
        return None

    # Extract components (skip the operator)
    if len(decomposition_str) > 1:
        operator = decomposition_str[0]
        components_str = decomposition_str[1:]
    else:
        return None

    # Process each component
    components = []
    for char in components_str:
        formatted = format_component(char, mmh_map, radical_map)
        if formatted:
            components.append(formatted)

    if not components:
        return None

    return " + ".join(components)

def get_character_breakdown(char, mmh_map, radical_map):
    """Get breakdown for a single character."""
    if char not in mmh_map:
        return f"  - {char}: (부수 분석 진행 중)"

    decomposition = mmh_map[char].get("decomposition", "")
    parsed = parse_decomposition(decomposition, mmh_map, radical_map)

    if parsed:
        return f"  - {char}: {parsed}"
    else:
        return f"  - {char}: (부수 분석 진행 중)"

def simple_translate(meaning_en):
    """Simple translation of English meaning to Korean."""
    if not meaning_en:
        return ""
    meaning_en_lower = meaning_en.lower()
    translations = {
        "variant": "변형", "surname": "성씨", "to": "~하다", "exceed": "초과하다",
    }
    for key, korean in translations.items():
        if key in meaning_en_lower:
            return korean
    words = meaning_en.split()[:2]
    return " ".join(words) if words else ""

def main():
    print("[START] Loading data...\n")

    words = load_hsk_data()
    radical_map = load_radical_map()
    mmh_map = load_mmh_data()

    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    print(f"[OK] Found {len(adv_words)} Advanced tier words\n")

    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)

    words_per_file = 100

    for file_num in range(1, 68):
        start_idx = (file_num - 1) * words_per_file
        end_idx = min(start_idx + words_per_file, len(adv_words))

        file_words = adv_words[start_idx:end_idx]

        if not file_words:
            break

        print(f"[PROCESSING] d{file_num:02d}_Top.md ({len(file_words)} words)...")

        # Create markdown content
        title = f"Top {start_idx + 1}–{end_idx} (HSK 6-9급 빈도)"
        content = f"# {title}\n\n"
        content += f"> 범위: 빈도 순위 {start_idx + 1}위 ~ {end_idx}위\n\n"
        content += f"> 수준: HSK 6-9급\n\n"
        content += f"> 단어 수: {len(file_words)}개\n\n"
        content += "---\n\n"

        for idx, word in enumerate(file_words, start=1):
            word_str = word['word']
            pinyin = word['pinyin']
            pos = get_pos_korean(word['pos'])
            meaning_en = word.get('meaningEn', '')
            korean_meaning = simple_translate(meaning_en)
            hsk_level = word['hskLevel']
            hsk_grade = f"{hsk_level}급" if hsk_level == 6 else "7-9급"
            word_id = word['id']

            # Generate character breakdown
            etymology_lines = []
            for char in word_str:
                breakdown = get_character_breakdown(char, mmh_map, radical_map)
                etymology_lines.append(breakdown)

            etymology = "\n".join(etymology_lines)

            # Format entry
            entry = f"### {start_idx + idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
            entry += "- 한자 풀이:\n"
            entry += etymology + "\n"
            entry += f"- HSK 등급: {hsk_grade}\n\n"
            entry += f"<!-- id: {word_id} -->\n\n"
            entry += "---\n\n"

            content += entry

        # Write file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"[OK] d{file_num:02d}_Top.md\n")

    print(f"[COMPLETE] Generated all d01-d67 with Korean definitions\n")

if __name__ == "__main__":
    main()
