#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate etymology from Make Me a Hanzi decomposition data."""

import json
import sys
from pathlib import Path
from collections import defaultdict

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
    print(f"[OK] Loaded {len(mmh_map)} characters from Make Me a Hanzi")
    return mmh_map

def parse_decomposition(decomposition_str, mmh_map, radical_map):
    """Parse decomposition string and convert to Korean explanation.

    Decomposition format examples:
    ⿰氵又 → left-right: 氵 and 又
    ⿱艹云 → top-bottom: 艹 and 云
    ⿴囗乃 → surround: 囗 surrounds 乃
    """
    if not decomposition_str or decomposition_str == "？":
        return "(부수 분석 진행 중)"

    # Map decomposition operators to Korean descriptions
    operators = {
        "⿰": "좌우결합",  # left-right
        "⿱": "상하결합",  # top-bottom
        "⿳": "위중아래",  # top-middle-bottom
        "⿲": "좌중우",    # left-middle-right
        "⿴": "감싸기",    # surrounding
        "⿵": "위에서감싸", # top-surrounding
        "⿶": "아래감싸",   # bottom-surrounding
        "⿷": "우측감싸",   # right-surrounding
        "⿸": "좌측감싸",   # left-surrounding
        "⿹": "겹침",      # overlapping
        "⿺": "겹친형태",  # overlapped form
        "⿻": "섞임",      # mixed
    }

    if not decomposition_str:
        return "(부수 분석 진행 중)"

    # Extract the operator and components
    operator = decomposition_str[0] if decomposition_str else ""
    components = decomposition_str[1:] if len(decomposition_str) > 1 else ""

    # Build explanation
    parts = []
    for char in components:
        if char in radical_map:
            korean_name = radical_map[char]
            parts.append(f"{char}({korean_name})")
        elif char in mmh_map and mmh_map[char].get("definition"):
            definition = mmh_map[char]["definition"][:10]  # Truncate long definitions
            parts.append(f"{char}({definition})")
        else:
            parts.append(f"{char}")

    if not parts:
        return "(부수 분석 진행 중)"

    # Format: char1(name1) + char2(name2) → meaning
    if len(parts) == 2:
        return f"  - {parts[0]} + {parts[1]}"
    elif len(parts) == 1:
        return f"  - {parts[0]}"
    else:
        return f"  - {' + '.join(parts)}"

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

def generate_character_breakdown(word_str, mmh_map, radical_map):
    """Generate detailed breakdown for each character in the word."""
    etymology_lines = []

    for char in word_str:
        if char in mmh_map:
            decomposition = mmh_map[char].get("decomposition", "")
            explanation = parse_decomposition(decomposition, mmh_map, radical_map)
            etymology_lines.append(explanation)
        else:
            etymology_lines.append(f"  - {char}: (부수 분석 진행 중)")

    return "\n".join(etymology_lines)

def main():
    print("[START] Loading data...\n")

    # Load all data
    words = load_hsk_data()
    radical_map = load_radical_map()
    mmh_map = load_mmh_data()
    print()

    # Filter and sort
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    print(f"[OK] Found {len(adv_words)} Advanced tier words\n")

    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)

    words_per_file = 100
    total_processed = 0

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
            etymology = generate_character_breakdown(word_str, mmh_map, radical_map)

            # Format entry
            entry = f"### {start_idx + idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
            entry += "- 한자 풀이:\n"
            entry += etymology + "\n"
            entry += f"- HSK 등급: {hsk_grade}\n\n"
            entry += f"<!-- id: {word_id} -->\n\n"
            entry += "---\n\n"

            content += entry
            total_processed += 1

        # Write file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"[OK] d{file_num:02d}_Top.md\n")

    print(f"[COMPLETE] Generated all d01-d67")
    print(f"[STATS] Total words: {total_processed}")

if __name__ == "__main__":
    main()
