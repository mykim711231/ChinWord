#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Enhance radical Korean names with common HSK radicals."""

import json
from pathlib import Path

# Standard radical Korean names for top HSK radicals
ENHANCED_RADICAL_NAMES = {
    # Communication/language radicals
    "讠": "말씀 언",  # speech radical

    # Building/roof radicals
    "宀": "집 면",   # roof radical

    # Size radicals
    "大": "클 대",   # big radical

    # Silk/thread radical
    "纟": "실 사",   # silk radical

    # Grass/herb radical
    "艹": "풀 초",   # grass radical

    # Hand/right part radical
    "又": "또 우",   # again radical

    # Wall/earth radical
    "阝": "언덕 부",  # mound radical

    # Sun/day radical
    "日": "해 일",   # sun radical

    # Woman/female radical
    "女": "여자 여", # woman radical

    # Strike radical
    "攵": "칠 복",   # strike radical

    # Meat/flesh radical
    "⺼": "고기 육",  # meat radical (variant)

    # Shellfish/wealth radical
    "贝": "조개 패",  # shell radical

    # Page/sheet radical
    "页": "쪽 면",   # page radical

    # Wide/broad radical
    "广": "넓을 광", # broad radical

    # Vehicle radical
    "车": "수레 차", # vehicle radical

    # Grass variant radical
    "⺮": "풀 초",   # grass radical (variant)

    # Grain radical
    "禾": "벼 화",   # grain radical

    # Tree variant radical
    "⺼": "고기 육",  # meat (flesh radical)

    # Stone radical
    "石": "돌 석",   # stone radical

    # Without/nothingness radical
    "无": "없을 무",  # nothingness radical

    # Wind radical
    "风": "바람 풍",  # wind radical

    # Ice radical
    "冫": "얼음 빙",  # ice radical

    # Evening radical
    "夕": "저녁 석",  # evening radical

    # Step radical
    "彳": "걸을 칭",  # step radical

    # Run radical
    "走": "달을 주",  # run radical

    # Rice radical
    "米": "쌀 미",    # rice radical

    # Moon/meat radical
    "月": "달 월",    # moon radical

    # Both/together radical
    "廾": "양손 공",  # both hands radical

    # Cliff/steep radical
    "厂": "절벽 광",  # cliff radical

    # Cloth/towel radical
    "巾": "수건 금",  # towel radical

    # Bow radical
    "弓": "활 궁",    # bow radical

    # Jade radical
    "王": "옥 왕",    # jade radical

    # Stand radical
    "立": "설 립",    # stand radical

    # Animal/beast radical
    "犭": "짐승 수",  # beast radical

    # Field radical
    "田": "밭 전",    # field radical

    # Ear radical
    "耳": "귀 이",    # ear radical

    # Self radical
    "自": "스스로 자",  # self radical

    # Sickness radical
    "疒": "병 질엄",  # sickness radical

    # Cave/hole radical
    "穴": "굴 혈",    # hole radical

    # Small radical
    "小": "작을 소",  # small radical

    # Corpse radical
    "尸": "시체 시",  # corpse radical

    # Roof variant
    "亠": "지붕 두",  # roof radical variant

    # Halberd radical
    "戈": "창 가",    # halberd radical

    # Ox radical
    "牛": "소 우",    # ox radical

    # Tall radical
    "高": "높을 고",  # tall radical

    # Inch radical
    "寸": "치 촌",    # inch radical

    # Yawn radical
    "欠": "하품 흠",  # yawn radical

    # Altar radical
    "礻": "제사 시",  # altar radical

    # See radical
    "见": "볼 견",    # see radical

    # Inside/village radical
    "里": "리 리",    # inside radical

    # Stop radical
    "止": "멈출 지",  # stop radical

    # Thread radical
    "糸": "실 사",    # thread radical

    # Bottle radical
    "酉": "닭 유",    # bottle radical

    # Gate radical
    "门": "문 문",    # gate radical

    # Eight variant
    "丷": "여덟 팔",  # eight variant

    # Plate radical
    "皿": "그릇 명",  # plate radical

    # Clothes radical
    "衣": "옷 의",    # clothes radical

    # Pig snout radical
    "彐": "돼지코 계",  # pig snout radical

    # Speak radical (variant)
    "曰": "말할 왈",  # speak radical

    # Water radical (already mapped)

    # Additional common radicals
    "子": "아들 자",  # son radical
    "马": "말 마",    # horse radical
    "金": "쇠 금",    # metal radical
    "气": "기운 기",  # gas radical
    "水": "물 수",    # water radical
    "火": "불 화",   # fire radical
    "木": "나무 목",  # wood radical
    "土": "흙 토",    # earth radical
    "手": "손 수",    # hand radical
    "口": "입 구",    # mouth radical
    "目": "눈 목",    # eye radical
    "心": "마음 심",  # heart radical
    "足": "발 족",    # foot radical
    "辶": "걸을 착",  # walk radical
    "亻": "사람 인",  # person radical
}

def update_radicals():
    """Update radicals_korean.json with enhanced Korean names."""

    # Load current data
    with open("data/radicals_korean.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        radicals = data.get("radicals", {})

    # Update with enhanced names
    for rad, korean_name in ENHANCED_RADICAL_NAMES.items():
        if rad not in radicals or "(부수," in radicals[rad]:
            radicals[rad] = korean_name

    # Save updated data
    data["radicals"] = radicals
    with open("data/radicals_korean.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Updated radicals_korean.json with {len(ENHANCED_RADICAL_NAMES)} Korean names")
    print(f"[OK] Total mappings: {len(radicals)}")

if __name__ == "__main__":
    update_radicals()
