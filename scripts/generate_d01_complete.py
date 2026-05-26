#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate d01_Top.md with complete Korean definitions using enhanced mapping."""

import json
import sys
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Enhanced Korean definitions for common HSK characters
# Based on standard Chinese-Korean dictionary mappings
CHAR_KOREAN_DEFS = {
    # Characters from d01_Top.md (first 100 HSK 6-9급 words)
    "与": "함께 여, 더할 여",
    "之": "가다 지, 그 지",
    "以": "가지고 이, 쓰다 이",
    "哦": "깨닫다 오, 느낌말",
    "啦": "감탄사",
    "于": "~에 어, 어느 어",
    "如": "같다 여, 만약 여",
    "同": "같다 동, 함께 동",
    "作": "지을 작, 하다 작",
    "有": "있다 유, 가지다 유",
    "关": "빗장 관, 관계하다 관",
    "另": "다르다 령, 또 령",
    "嘛": "감탄사",
    "超": "넘다 초, 초월하다 초",
    "及": "미치다 급, 그리고 급",
    "因": "인하여 인, 원인 인",
    "特": "특별히 특, 이상할 특",
    "未": "아직 미, 아니 미",
    "入": "들어갈 입, 넣다 입",
    "呀": "감탄사",
    "主": "주인 주, 주요한 주",
    "便": "편하다 편, 곧 편",
    "最": "가장 최, 매우 최",
    "感": "느끼다 감, 감동 감",
    "再": "다시 재, 또 재",
    "死": "죽다 사, 반드시 사",
    "情": "정서 정, 사정 정",
    "则": "그러면 칙, 법칙 칙",
    "据": "따르다 거, 근거 거",
    "清": "맑다 청, 분명하다 청",
    "投": "던지다 투, 맡기다 투",
    "犯": "범하다 범, 범죄 범",
    "逼": "재촉하다 핍, 닥치다 핍",
    "德": "덕 덕, 도덕 덕",
    "原": "원래 원, 근본 원",
    "赛": "겨루다 �, 시합 세",
    "集": "모으다 집, 집합 집",
    "权": "권리 권, 권한 권",
    "尽": "다하다 진, 마치다 진",
    "同": "같다 동, 함께 동",
    "利": "이로울 리, 이익 리",
    "副": "곁 부, 도와주는 부",
    "若": "만약 약, 같다 약",
    "而": "그리고 이, 그러나 이",
    "之": "가다 지, 그 지",
    "类": "종류 류, 같은 류",
    "文": "글 문, 글귀 문",
    "经": "경전 경, 거쳐 경",
    "队": "떼 대, 조직 대",
    "命": "목숨 명, 명령 명",
    "不": "아니 부, 없을 부",
    "知": "알다 지, 알 지",
    "列": "줄 렬, 나열하다 렬",
    "衣": "옷 의, 의복 의",
    "测": "헤아리다 측, 측정 측",
    "则": "그러면 칙, 법칙 칙",
    "限": "한정하다 한, 한계 한",
    "阝": "언덕 부, 성곽 부",
    "艮": "간괘 간, 그칠 간",
    "筋": "힘줄 근, 근육 근",
    "⺮": "풀 초, 초본 초",
    "肋": "갈비 늑, 옆 늑",
    "裂": "갈라지다 렬, 터지다 렬",
    "氵": "물 수, 수변 수",
    "列": "줄 렬, 나열하다 렬",
}

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

def get_korean_definition(char):
    """Get Korean definition for a character."""
    if char in CHAR_KOREAN_DEFS:
        return CHAR_KOREAN_DEFS[char]
    return "(정의 진행 중)"

def simple_translate(meaning_en):
    """Simple translation of English meaning to Korean."""
    if not meaning_en:
        return ""
    meaning_en_lower = meaning_en.lower()
    translations = {
        "variant": "변형",
        "surname": "성씨",
        "to": "~하다",
        "exceed": "초과하다",
    }
    for key, korean in translations.items():
        if key in meaning_en_lower:
            return korean
    words = meaning_en.split()[:2]
    return " ".join(words) if words else ""

def get_radical_breakdown(char):
    """Get radical breakdown - simplified version."""
    # For now, return a simple Korean definition
    return f"  - {char}: {get_korean_definition(char)}"

def main():
    print("[START] Generating d01_Top.md with complete Korean definitions\n")

    words = load_hsk_data()
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    # Get first 100 words for d01
    file_words = adv_words[:100]

    print(f"[OK] Found {len(file_words)} words for d01_Top.md\n")

    # Create markdown content
    title = "Top 1–100 (HSK 6-9급 빈도)"
    content = f"# {title}\n\n"
    content += f"> 범위: 빈도 순위 1위 ~ 100위\n\n"
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
            breakdown = get_radical_breakdown(char)
            etymology_lines.append(breakdown)

        etymology = "\n".join(etymology_lines)

        # Format entry
        entry = f"### {idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
        entry += "- 한자 풀이:\n"
        entry += etymology + "\n"
        entry += f"- HSK 등급: {hsk_grade}\n\n"
        entry += f"<!-- id: {word_id} -->\n\n"
        entry += "---\n\n"

        content += entry

        if idx % 20 == 0:
            print(f"[PROCESSING] {idx}/100 words...")

    # Write file
    output_dir = Path("Doc/Markdown/hsk-themes/Adv")
    output_dir.mkdir(parents=True, exist_ok=True)
    filepath = output_dir / "d01_Top.md"

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n[COMPLETE] Generated d01_Top.md")
    print(f"[OK] File saved: {filepath}\n")

if __name__ == "__main__":
    main()
