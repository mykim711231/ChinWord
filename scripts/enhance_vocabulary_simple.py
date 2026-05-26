#!/usr/bin/env python3
"""Enhance vocabulary files with Korean meanings and radical analysis (no API)."""

import json
import re
from pathlib import Path

# 부수 정보 매핑 (일부)
RADICAL_MAP = {
    # 구조: 부수 한자: (한글명, 부수명)
    "亅": ("세로금", "亅"),
    "戈": ("창 과", "戈"),
    "日": ("해 일", "日"),
    "亻": ("사람 인", "亻"),
    "土": ("흙 토", "土"),
    "一": ("한 일", "一"),
    "月": ("달 월", "月"),
    "人": ("사람 인", "人"),
    "儿": ("아이 아", "儿"),
    "入": ("들어갈 입", "入"),
    "力": ("힘 력", "力"),
    "冂": ("감쌀 곽", "冂"),
    "几": ("기틀 기", "几"),
    "凵": ("통 구", "凵"),
    "刀": ("칼 도", "刀"),
    "刂": ("칼 도", "刂"),
    "十": ("열 십", "十"),
    "又": ("또 우", "又"),
    "口": ("입 구", "口"),
    "囗": ("둘러싸일 국", "囗"),
    "大": ("큰 대", "大"),
    "女": ("여자 녀", "女"),
    "子": ("아들 자", "子"),
    "宀": ("집 면", "宀"),
    "寸": ("치수 촌", "寸"),
    "小": ("작을 소", "小"),
    "尸": ("시체 시", "尸"),
    "山": ("산 산", "山"),
    "工": ("공 공", "工"),
    "己": ("자기 기", "己"),
    "巾": ("수건 건", "巾"),
    "干": ("마를 건", "干"),
    "广": ("집 광", "廣"),
    "廴": ("끌 연", "廴"),
    "廾": ("열 십", "廾"),
    "彳": ("걸을 척", "彳"),
    "心": ("마음 심", "心"),
    "戈": ("창 과", "戈"),
    "戶": ("집 호", "戶"),
    "手": ("손 수", "手"),
    "支": ("가지 지", "支"),
    "文": ("글 문", "文"),
    "斗": ("되 두", "斗"),
    "斤": ("금 근", "斤"),
    "方": ("모 방", "方"),
    "无": ("없을 무", "无"),
    "日": ("날 일", "日"),
    "曰": ("말 왈", "曰"),
    "月": ("달 월", "月"),
    "木": ("나무 목", "木"),
    "欠": ("모자랄 흠", "欠"),
    "止": ("멈출 지", "止"),
    "歹": ("나쁠 패", "歹"),
    "殳": ("때릴 수", "殳"),
    "殼": ("껍질 각", "殼"),
    "水": ("물 수", "水"),
    "火": ("불 화", "火"),
    "爪": ("발톱 조", "爪"),
    "父": ("아버지 부", "父"),
    "爻": ("괘 효", "爻"),
    "爿": ("침대 상", "爿"),
    "片": ("조각 편", "片"),
    "牙": ("이 아", "牙"),
    "牛": ("소 우", "牛"),
    "犬": ("개 견", "犬"),
    "玄": ("검을 현", "玄"),
    "玉": ("옥 옥", "玉"),
    "瓜": ("수박 과", "瓜"),
    "瓦": ("기와 와", "瓦"),
    "甘": ("달 감", "甘"),
    "生": ("날 생", "生"),
    "用": ("쓸 용", "用"),
    "田": ("밭 전", "田"),
    "皿": ("접시 명", "皿"),
    "皮": ("가죽 피", "皮"),
    "皿": ("그릇 명", "皿"),
    "矢": ("화살 시", "矢"),
    "石": ("돌 석", "石"),
    "龙": ("용 용", "龙"),
    "网": ("그물 망", "网"),
    "羊": ("양 양", "羊"),
    "羽": ("깃 우", "羽"),
    "老": ("늙을 로", "老"),
    "而": ("그러나 이", "而"),
    "耒": ("쟁기 뢰", "耒"),
    "耳": ("귀 이", "耳"),
    "聿": ("글 필", "聿"),
    "肉": ("살 육", "肉"),
    "自": ("스스로 자", "自"),
    "至": ("이를 지", "至"),
    "臼": ("절구 구", "臼"),
    "舌": ("혀 설", "舌"),
    "舟": ("배 주", "舟"),
    "艮": ("멈출 간", "艮"),
    "色": ("빛 색", "色"),
    "艸": ("풀 초", "艸"),
    "虍": ("호랑이 호", "虍"),
    "虫": ("벌레 충", "虫"),
    "血": ("피 혈", "血"),
    "行": ("갈 행", "行"),
    "衣": ("옷 의", "衣"),
    "襾": ("덮을 아", "襾"),
    "西": ("서쪽 서", "西"),
    "見": ("볼 견", "見"),
    "角": ("뿔 각", "角"),
    "言": ("말 언", "言"),
    "谷": ("골짜기 곡", "谷"),
    "豆": ("콩 두", "豆"),
    "豕": ("돼지 시", "豕"),
    "豸": ("여우 치", "豸"),
    "貝": ("조개 패", "貝"),
    "赤": ("빨강 적", "赤"),
    "走": ("달릴 주", "走"),
    "足": ("발 족", "足"),
    "身": ("몸 신", "身"),
    "車": ("수레 거", "車"),
    "辛": ("매울 신", "辛"),
    "辵": ("걸을 착", "辵"),
    "邑": ("고을 읍", "邑"),
    "邦": ("나라 방", "邦"),
    "金": ("쇠 금", "金"),
    "長": ("길 장", "長"),
    "門": ("문 문", "門"),
    "阜": ("언덕 부", "阜"),
    "隶": ("종 예", "隶"),
    "隹": ("새 추", "隹"),
    "雨": ("비 우", "雨"),
    "青": ("푸를 청", "青"),
    "非": ("아닐 비", "非"),
    "面": ("얼굴 면", "面"),
    "革": ("가죽 혁", "革"),
    "韋": ("가죽 위", "韋"),
    "韭": ("부추 구", "韭"),
    "音": ("소리 음", "音"),
    "頁": ("머리 페", "頁"),
    "風": ("바람 풍", "風"),
    "飛": ("날 비", "飛"),
    "食": ("먹을 식", "食"),
    "首": ("머리 수", "首"),
    "香": ("향기 향", "香"),
    "馬": ("말 마", "馬"),
    "骨": ("뼈 골", "骨"),
    "高": ("높을 고", "高"),
    "髟": ("털 비", "髟"),
    "鬥": ("싸움 투", "鬥"),
    "鬯": ("향초 창", "鬯"),
    "鬱": ("울울할 울", "鬱"),
    "鬼": ("귀신 귀", "鬼"),
    "魚": ("물고기 어", "魚"),
    "鳥": ("새 조", "鳥"),
    "鹵": ("짭짤할 로", "鹵"),
    "鹿": ("사슴 록", "鹿"),
    "麗": ("아름다울 려", "麗"),
    "麥": ("보리 맥", "麥"),
    "麻": ("삼 마", "麻"),
    "黃": ("노랑 황", "黃"),
    "黑": ("검을 흑", "黑"),
    "黽": ("개구리 명", "黽"),
    "鼎": ("솥 정", "鼎"),
    "鼓": ("북 고", "鼓"),
    "鼠": ("쥐 서", "鼠"),
    "鼻": ("코 비", "鼻"),
    "齊": ("가지런할 제", "齊"),
    "齒": ("이 치", "齒"),
    "龍": ("용 용", "龍"),
    "龠": ("새소리 약", "龠"),
}

# 간단한 의미 매핑 (meaningEn -> 한글)
MEANING_MAPPING = {
    "to be": "~이다, 있다",
    "and": "그리고, ~와",
    "the": "~의",
    "in": "~에, ~안에",
    "of": "~의",
    "to": "~로, ~에",
    "have": "가지다, 있다",
    "this": "이것",
    "that": "그것",
    "is": "이다",
    "are": "이다",
    "can": "할 수 있다",
    "will": "~할 것이다",
    "with": "~와 함께",
    "from": "~에서",
    "for": "~를 위해",
    "on": "~위에",
    "at": "~에",
    "by": "~에 의해",
    "about": "~에 대해",
    "as": "~로서",
    "or": "또는",
    "but": "하지만",
    "not": "아니다",
    "only": "오직",
    "also": "또한",
    "very": "매우",
    "more": "더",
    "most": "가장",
    "some": "어떤",
    "all": "모든",
    "each": "각각",
    "which": "어느",
    "who": "누가",
    "what": "무엇",
    "when": "언제",
    "where": "어디",
    "why": "왜",
    "how": "어떻게",
}

def simple_translate(meaning_en):
    """Simple heuristic translation of English meaning to Korean."""
    if not meaning_en:
        return ""

    # Simple keyword-based translation
    meaning_en_lower = meaning_en.lower()

    # Common patterns and their Korean translations
    translations = {
        "variant": "변형",
        "surname": "성씨",
        "to": "~하다",
        "to chant": "노래하다",
        "singing": "노래",
        "cheering": "환호",
        "exceed": "초과하다",
        "and": "그리고",
        "like": "같은, 처럼",
        "with": "~와 함께",
        "have": "가지다",
        "worker": "일꾼",
        "other": "다른",
        "used in": "~에 쓰임",
        "old": "예전의",
    }

    # Try to find matching translations
    for key, korean in translations.items():
        if key in meaning_en_lower:
            return korean

    # Fallback: take first few words
    words = meaning_en.split()[:3]
    if words:
        return " ".join(words[:2])

    return "의미 분석 진행 중"

def get_radical_analysis(word):
    """Generate basic radical analysis for each character."""
    lines = []
    for char in word:
        if char in RADICAL_MAP:
            korean_name, radical = RADICAL_MAP[char]
            lines.append(f"  - {char}: {korean_name}")
        else:
            # Fallback: try to extract from character decomposition
            lines.append(f"  - {char}: (부수 분석 진행 중)")
    return "\n".join(lines)

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

def main():
    print("Loading HSK data...")
    words = load_hsk_data()

    # Get Advanced tier words (HSK 6-9급)
    adv_words = [w for w in words if w["hskLevel"] >= 6]
    adv_words.sort(key=lambda x: x["freqRank"])

    print(f"Found {len(adv_words)} Advanced tier words")

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

        print(f"Processing d{file_num:02d}_Top.md ({len(file_words)} words)...", end=" ")

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

            # Generate entry
            entry = f"### {start_idx + idx}. {word_str} / {pinyin} / [{pos}] / {korean_meaning}\n\n"
            entry += "- 한자 풀이:\n"
            entry += get_radical_analysis(word_str)
            entry += "\n"
            entry += f"- HSK 등급: {hsk_grade}\n\n"
            entry += f"<!-- id: {word_id} -->\n\n"
            entry += "---\n\n"

            content += entry
            total_processed += 1

        # Write to file
        filename = f"d{file_num:02d}_Top.md"
        filepath = output_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print("OK")

    print(f"\nComplete! Generated all d01-d67 with {total_processed} words")

if __name__ == "__main__":
    main()
