#!/usr/bin/env python3
"""Regenerate Adv tier d01-d67 files excluding English meanings."""

import json
from pathlib import Path
from collections import defaultdict

def load_hsk_data():
    """Load HSK words data."""
    data_file = Path("app/src/data/hsk-words.json")
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)

def get_pos_korean(pos_list):
    """Convert POS tags to Korean grammatical categories."""
    pos_mapping = {
        # 기본 품사
        "n": "명사",
        "v": "동사",
        "a": "형용사",
        "d": "부사",
        "p": "전치사",
        "c": "접속사",
        "cc": "접속사",
        "u": "조사",
        "r": "대명사",
        "y": "감탄사",

        # 명사 세분화
        "nr": "인명",
        "ns": "지명",
        "nt": "기관명",
        "nz": "기타명사",

        # 수량사 관련
        "m": "수사",
        "mq": "수량사",
        "q": "양사",
        "qt": "시간양사",
        "qv": "동량사",

        # 형용사 관련
        "ad": "형용사성부사",
        "an": "명사성형용사",

        # 시간 관련
        "t": "시간명사",
        "tg": "시간명사",

        # 복합 품사
        "vn": "동명사",

        # 기타
        "f": "방위사",
        "x": "보조동사",
        "o": "의성어",
        "e": "의태어",
        "b": "수식언",
        "g": "기타",
        "h": "전감사",
        "k": "용언접미사",
        "l": "명사접미사",
        "s": "처소사",
        "z": "문법단위",
        "Mg": "외국어",
        "Rg": "고유명사",
    }
    korean_pos = [pos_mapping.get(p, p) for p in pos_list if p]
    # Remove duplicates while maintaining order
    korean_pos = list(dict.fromkeys(korean_pos))
    return "/".join(korean_pos) if korean_pos else "기타"

def get_radical_korean(radical_char):
    """Get Korean radical name for a character."""
    radical_map = {
        "白": "하얀 흰",
        "亅": "세로금",
        "戈": "창 과",
        "日": "해 일",
        "亻": "사람 인",
        "土": "흙 토",
        "一": "한 일",
        "月": "달 월",
        # Add more as needed
    }
    return radical_map.get(radical_char, f"(부수:{radical_char})")

def generate_markdown_entry(index, word_data):
    """Generate markdown entry for a word."""
    word = word_data["word"]
    pinyin = word_data["pinyin"]
    pos = get_pos_korean(word_data["pos"])
    meaning = word_data.get("meaning", "") or ""
    hsk_level = word_data["hskLevel"]
    hsk_grade = f"{hsk_level}급" if hsk_level == 6 else "7-9급"
    word_id = word_data["id"]
    radical = word_data.get("radical", "")

    radical_korean = get_radical_korean(radical)

    entry = f"### {index}. {word} / {pinyin} / [{pos}] / {meaning}\n\n"
    entry += f"- 한자 풀이:\n"
    entry += f"  - {word}: {radical_korean}\n"
    entry += f"- HSK 등급: {hsk_grade}\n\n"
    entry += f"<!-- id: {word_id} -->\n\n"
    entry += "---\n\n"

    return entry

def main():
    print("Loading HSK data...")
    words = load_hsk_data()

    # Group words by frequency rank to determine HSK level batches
    # For Advanced tier: HSK 6-9급 words
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    print(f"Found {len(adv_words)} Advanced tier words")

    # Generate d01-d67 files
    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)

    words_per_file = 100
    for file_num in range(1, 68):
        start_idx = (file_num - 1) * words_per_file
        end_idx = min(start_idx + words_per_file, len(adv_words))

        file_words = adv_words[start_idx:end_idx]

        if not file_words:
            break

        # Create markdown content
        title = f"Top {start_idx + 1}–{end_idx} (HSK 6-9급 빈도)"
        content = f"# {title}\n\n"
        content += f"> 범위: 빈도 순위 {start_idx + 1}위 ~ {end_idx}위\n\n"
        content += f"> 수준: HSK 6-9급\n\n"
        content += f"> 단어 수: {len(file_words)}개\n\n"
        content += "---\n\n"

        for idx, word in enumerate(file_words, start=start_idx + 1):
            content += generate_markdown_entry(idx - start_idx, word)

        # Write to file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"Generated {filename} ({len(file_words)} words)")

    print("\nDone! All d01-d67 files regenerated without English meanings.")

if __name__ == "__main__":
    main()
