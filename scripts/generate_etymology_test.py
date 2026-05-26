#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test etymology generation with first 5 files."""

import json
import sys
from pathlib import Path
from anthropic import Anthropic

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

client = Anthropic()

def load_hsk_data():
    """Load HSK words data."""
    with open("app/src/data/hsk-words.json", "r", encoding="utf-8") as f:
        return json.load(f)

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

def generate_word_etymology(word, meaning_en):
    """Generate etymology for word."""
    prompt = f"""주어진 단어 '{word}'의 각 한자에 대해 한글로 상세한 한자 풀이를 해줘.

형식:
  - 한자: [부수1](부수명1) + [부수2](부수명2) → "의미"

예시:
  - 谢: 讠(말씀언변) + 射(쏠사) → 말로써 감사를 표현하다
  - 你: 亻(사람인변) + 尔(너 이) → "너"라는 뜻의 2인칭 대명사

단어 의미: {meaning_en}

각 한자별로 부수 분해와 의미를 간단하게 1-2줄로 설명해줘."""

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

def simple_translate(meaning_en):
    """Simple translation."""
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
    print("[START] Test: Generating etymology for first 50 words\n")

    words = load_hsk_data()
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Test with first 50 words only
    test_words = adv_words[:50]

    print(f"# Top 1–50 (HSK 6-9급 빈도)\n\n")
    print(f"> 범위: 빈도 순위 1위 ~ 50위\n\n")
    print(f"> 수준: HSK 6-9급\n\n")
    print(f"> 단어 수: {len(test_words)}개\n\n")
    print("---\n\n")

    content = f"# Top 1–50 (HSK 6-9급 빈도)\n\n"
    content += f"> 범위: 빈도 순위 1위 ~ 50위\n\n"
    content += f"> 수준: HSK 6-9급\n\n"
    content += f"> 단어 수: {len(test_words)}개\n\n"
    content += "---\n\n"

    for idx, word in enumerate(test_words, start=1):
        try:
            word_str = word['word']
            pinyin = word['pinyin']
            pos = get_pos_korean(word['pos'])
            meaning_en = word.get('meaningEn', '')
            korean_meaning = simple_translate(meaning_en)
            hsk_level = word['hskLevel']
            hsk_grade = f"{hsk_level}급" if hsk_level == 6 else "7-9급"
            word_id = word['id']

            print(f"[{idx}/50] {word_str}...", end=" ", flush=True)
            etymology = generate_word_etymology(word_str, meaning_en)
            print("[OK]")

            entry = f"### {idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
            entry += "- 한자 풀이:\n"
            entry += f"{etymology}\n\n"
            entry += f"- HSK 등급: {hsk_grade}\n\n"
            entry += f"<!-- id: {word_id} -->\n\n"
            entry += "---\n\n"

            content += entry

        except Exception as e:
            print(f"[ERROR] {e}")

    # Write test file
    filepath = output_dir / "d00_Test.md"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n[DONE] Test file saved to {filepath}")

if __name__ == "__main__":
    main()
