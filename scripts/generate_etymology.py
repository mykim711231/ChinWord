#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate etymological Han character analysis using Claude API."""

import json
import os
from pathlib import Path
from anthropic import Anthropic

client = Anthropic()

def load_hsk_data():
    """Load HSK words data."""
    with open("app/src/data/hsk-words.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_radical_map():
    """Load radical Korean names."""
    with open("data/radicals_korean.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("radicals", {})

def get_pos_korean(pos_list):
    """Convert POS tags to Korean grammatical categories."""
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

def generate_character_etymology(character, word_meaning):
    """Generate etymological analysis for a single character."""
    prompt = f"""주어진 한자 '{character}'에 대해 한글로 상세한 한자 풀이를 해줘.

형식:
{character}: [부수1](부수명1) + [부수2](부수명2) → "의미 설명"

예시:
你: 亻(사람인변) + 尔(너 이) → "너, 그대"라는 뜻의 2인칭 대명사
好: 女(계집녀) + 子(아들자) → "좋다"라는 뜻, 여자와 아이가 함께 있는 모습에서 유래

단어 의미: {word_meaning}

부수 분해와 의미를 간단하고 명확하게 한두 줄로 설명해줘.
만약 정확한 분해를 모르면 "부수 분석 진행 중"이라고 표시해도 돼."""

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

def generate_word_etymology(word, meaning_en):
    """Generate etymology for all characters in a word."""
    if not word or len(word) == 0:
        return ""

    # For multi-character words, request a batch analysis
    if len(word) > 1:
        prompt = f"""주어진 단어 '{word}'의 각 한자에 대해 한글로 상세한 한자 풀이를 해줘.

형식:
- 한자: [부수1](부수명1) + [부수2](부수명2) → "의미"

예시:
- 谢: 讠(말씀언변) + 射(쏠사) → 말로써 감사를 표현하다
- 谢: 讠(말씀언변) + 사(소리요소) → 감사를 나타내는 글자

단어 의미: {meaning_en}

각 한자별로 부수 분해와 의미를 간단하게 설명해줘."""

        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    else:
        # Single character
        return generate_character_etymology(word, meaning_en)

def simple_translate(meaning_en):
    """Simple heuristic translation of English meaning to Korean."""
    if not meaning_en:
        return ""

    meaning_en_lower = meaning_en.lower()

    translations = {
        "variant": "변형", "surname": "성씨", "to": "~하다", "exceed": "초과하다",
        "and": "그리고", "like": "같은, 처럼", "with": "~와 함께", "have": "가지다",
        "worker": "일꾼", "other": "다른", "used in": "~에 쓰임", "old": "예전의",
    }

    for key, korean in translations.items():
        if key in meaning_en_lower:
            return korean

    words = meaning_en.split()[:3]
    if words:
        return " ".join(words[:2])

    return ""

def main():
    print("[START] Loading data...\n")

    # Load data
    words = load_hsk_data()
    radical_map = load_radical_map()

    # Filter advanced tier
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    print(f"[OK] Found {len(adv_words)} Advanced tier words")
    print(f"[OK] Loaded {len(radical_map)} radical mappings\n")

    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)

    words_per_file = 100
    total_processed = 0
    api_calls = 0

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
            try:
                word_str = word['word']
                pinyin = word['pinyin']
                pos = get_pos_korean(word['pos'])
                meaning_en = word.get('meaningEn', '')
                korean_meaning = simple_translate(meaning_en)
                hsk_level = word['hskLevel']
                hsk_grade = f"{hsk_level}급" if hsk_level == 6 else "7-9급"
                word_id = word['id']

                # Generate etymology
                print(f"  [{idx}/{len(file_words)}] {word_str}...", end=" ")
                etymology = generate_word_etymology(word_str, meaning_en)
                api_calls += 1
                print("[OK]")

                # Format entry
                entry = f"### {start_idx + idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
                entry += "- 한자 풀이:\n"
                entry += f"  {etymology}\n"
                entry += f"- HSK 등급: {hsk_grade}\n\n"
                entry += f"<!-- id: {word_id} -->\n\n"
                entry += "---\n\n"

                content += entry
                total_processed += 1

            except Exception as e:
                print(f"[ERROR] {word['word']}: {e}")
                # Fallback
                entry = f"### {start_idx + idx}. {word['word']} / {word['pinyin']} / [{get_pos_korean(word['pos'])}] / \n\n"
                entry += "- 한자 풀이:\n  - (부수 분석 진행 중)\n"
                entry += f"- HSK 등급: {word['hskLevel']}급\n\n"
                entry += f"<!-- id: {word['id']} -->\n\n---\n\n"
                content += entry

        # Write file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"[DONE] d{file_num:02d}_Top.md saved\n")

    print(f"\n[COMPLETE] Generated all d01-d67")
    print(f"[STATS] Total words processed: {total_processed}")
    print(f"[STATS] API calls made: {api_calls}")

if __name__ == "__main__":
    main()
