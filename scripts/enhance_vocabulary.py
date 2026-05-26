#!/usr/bin/env python3
"""Enhance vocabulary files with Korean meanings and radical analysis."""

import json
import os
from pathlib import Path
from anthropic import Anthropic

client = Anthropic()

def load_hsk_data():
    """Load HSK words data."""
    data_file = Path("app/src/data/hsk-words.json")
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)

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

def generate_radical_analysis(characters, meaning_en):
    """Generate radical analysis for Chinese characters using Claude."""
    prompt = f"""각 한자의 부수(radical) 구조를 분석해줘. 다음 형식으로:

한자: [부수(한글명)] + [부수(한글명)] → [의미]

예시:
头: 大(큰대) + 丶(점주) → 머리, 대
疼: 疒(병질엄) + 冬(겨울동) → 아프다, 통증

한자(들): {', '.join(characters)}
의미: {meaning_en}

각 한자별로 줄바꿈으로 분석해줘. 부수 분해가 어려우면 "부수 분석 진행 중" 으로 표시해도 돼."""

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

def translate_to_korean(meaning_en):
    """Translate English meaning to Korean."""
    prompt = f"""다음 중국어 단어의 영문 뜻을 자연스러운 한글로 번역해줘.
간단하고 실용적인 표현으로, 2-3개 정도만 골라서:

영문: {meaning_en}

답변 형식: "한글뜻1, 한글뜻2"
예: "머리가 아프다, 두통"
     "밥을 먹다, 식사하다"
"""

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

def process_word(word_data):
    """Process a single word to generate enhanced entry."""
    word = word_data["word"]
    pinyin = word_data["pinyin"]
    pos = get_pos_korean(word_data["pos"])
    meaning_en = word_data.get("meaningEn", "")
    hsk_level = word_data["hskLevel"]
    hsk_grade = f"{hsk_level}급" if hsk_level == 6 else "7-9급"
    word_id = word_data["id"]

    # Generate Korean meaning
    korean_meaning = translate_to_korean(meaning_en) if meaning_en else ""

    # Generate radical analysis
    characters = list(word)
    radical_analysis = generate_radical_analysis(characters, meaning_en)

    return {
        "word": word,
        "pinyin": pinyin,
        "pos": pos,
        "korean_meaning": korean_meaning,
        "radical_analysis": radical_analysis,
        "hsk_grade": hsk_grade,
        "word_id": word_id,
    }

def format_radical_analysis(analysis_text):
    """Format radical analysis into markdown list."""
    lines = analysis_text.strip().split('\n')
    formatted_lines = []
    for line in lines:
        line = line.strip()
        if line and ':' in line:
            parts = line.split(':', 1)
            char = parts[0].strip()
            detail = parts[1].strip()
            formatted_lines.append(f"  - {char}: {detail}")
        elif line:
            # Handle cases without colon
            formatted_lines.append(f"  - {line}")
    return '\n'.join(formatted_lines)

def generate_markdown_entry(index, processed_word):
    """Generate markdown entry with new format."""
    entry = f"### {index}. {processed_word['word']} / {processed_word['pinyin']} / [{processed_word['pos']}] / {processed_word['korean_meaning']}\n\n"
    entry += "- 한자 풀이:\n"
    entry += format_radical_analysis(processed_word['radical_analysis'])
    entry += "\n"
    entry += f"- HSK 등급: {processed_word['hsk_grade']}\n\n"
    entry += f"<!-- id: {processed_word['word_id']} -->\n\n"
    entry += "---\n\n"
    return entry

def main():
    print("Loading HSK data...")
    words = load_hsk_data()

    # Get Advanced tier words (HSK 6-9급)
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    print(f"Found {len(adv_words)} Advanced tier words")
    print("Starting enhancement process...")

    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)

    words_per_file = 100
    total_processed = 0

    for file_num in range(1, 2):  # Test with d01 only
        start_idx = (file_num - 1) * words_per_file
        end_idx = min(start_idx + words_per_file, len(adv_words))

        file_words = adv_words[start_idx:end_idx]

        if not file_words:
            break

        print(f"\nProcessing d{file_num:02d}_Top.md ({len(file_words)} words)...")

        # Create markdown content
        title = f"Top {start_idx + 1}–{end_idx} (HSK 6-9급 빈도)"
        content = f"# {title}\n\n"
        content += f"> 범위: 빈도 순위 {start_idx + 1}위 ~ {end_idx}위\n\n"
        content += f"> 수준: HSK 6-9급\n\n"
        content += f"> 단어 수: {len(file_words)}개\n\n"
        content += "---\n\n"

        for idx, word in enumerate(file_words, start=1):
            try:
                processed = process_word(word)
                entry = generate_markdown_entry(start_idx + idx, processed)
                content += entry
                total_processed += 1

                if idx % 10 == 0:
                    print(f"  Processed {idx}/{len(file_words)} words...")
            except Exception as e:
                print(f"  Error processing word {word['word']}: {e}")
                # Fallback to basic format
                basic_entry = f"### {start_idx + idx}. {word['word']} / {word['pinyin']} / [{get_pos_korean(word['pos'])}] / \n\n"
                basic_entry += "- 한자 풀이:\n  - (부수 분석 진행 중)\n"
                basic_entry += f"- HSK 등급: {word['hskLevel']}급\n\n"
                basic_entry += f"<!-- id: {word['id']} -->\n\n---\n\n"
                content += basic_entry

        # Write to file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"✓ Generated {filename}")

    print(f"\n✓ Complete! Processed {total_processed} words across d01-d67")

if __name__ == "__main__":
    main()
