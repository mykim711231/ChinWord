#!/usr/bin/env python3
"""Enhance vocabulary files with Korean meanings and radical analysis (no API)."""

import json
from pathlib import Path

def load_radical_data():
    """Load radical Korean names mapping."""
    data_file = Path("data/radicals_korean.json")
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            radicals = data.get("radicals", {})
            print(f"[OK] Loaded {len(radicals)} radical mappings")
            return radicals
    except Exception as e:
        print(f"[ERROR] Loading radicals: {e}")
        return {}

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

    return "의미 분석 진행 중"

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

def main():
    print("Loading data...")

    # Load radicals
    radical_map = load_radical_data()

    # Load HSK data
    with open("app/src/data/hsk-words.json", "r", encoding="utf-8") as f:
        words = json.load(f)

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
            word_radical = word.get('radical', '')

            # Generate radical analysis using radical from hsk-words.json
            radical_lines = []
            if word_radical and word_radical in radical_map:
                korean_name = radical_map[word_radical]
                radical_lines.append(f"  - {word_str}: {word_radical} ({korean_name})")
            elif word_radical:
                radical_lines.append(f"  - {word_str}: {word_radical} (부수 분석 진행 중)")
            else:
                radical_lines.append(f"  - {word_str}: (부수 정보 없음)")

            radical_text = "\n".join(radical_lines)

            # Generate entry
            entry = f"### {start_idx + idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
            entry += "- 한자 풀이:\n"
            entry += radical_text + "\n"
            entry += f"- HSK 등급: {hsk_grade}\n\n"
            entry += f"<!-- id: {word_id} -->\n\n"
            entry += "---\n\n"

            content += entry

        # Write to file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"[OK] d{file_num:02d}_Top.md")

    print(f"\n[DONE] Generated all d01-d67 with {len(adv_words)} words")

if __name__ == "__main__":
    main()
