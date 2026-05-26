import json
import re
from pathlib import Path

# HSK 5급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_data = json.loads(f.read())

hsk5_words = [w for w in words_data if w.get('hskLevel') == 5]
hsk5_by_id = {w['id']: w for w in hsk5_words}

# 테마별 설정
theme_config = {
    't01_daily_일상과_구어': {
        'title': '일상과 구어 (日常与口语)',
        'keywords': ['say', 'talk', 'chat', 'casual', 'daily', 'ordinary', 'regular', 'common', 'usually', 'simply', 'just', 'anyway', 'probably', 'suddenly', 'gradually', 'speak', 'language', 'conversation', 'word', 'voice']
    },
    't02_work_직장과_경제': {
        'title': '직장과 경제 (职场与经济)',
        'keywords': ['company', 'business', 'manage', 'employee', 'salary', 'market', 'economy', 'finance', 'invest', 'trade', 'profit', 'customer', 'contract', 'project', 'report', 'meeting', 'work', 'office', 'job', 'service', 'sell', 'buy']
    },
    't03_society_사회와_문화': {
        'title': '사회와 문화 (社会与文化)',
        'keywords': ['society', 'community', 'culture', 'tradition', 'custom', 'festival', 'art', 'history', 'education', 'news', 'media', 'public', 'citizen', 'religion', 'ceremony', 'performance']
    },
    't04_emotion_감정과_심리': {
        'title': '감정과 심리 (情感与心理)',
        'keywords': ['happy', 'sad', 'angry', 'fear', 'love', 'hate', 'feel', 'emotion', 'mood', 'heart', 'mind', 'think', 'worry', 'excited', 'joy', 'sorrow']
    },
    't05_nature_자연과_과학': {
        'title': '자연과 과학 (自然与科学)',
        'keywords': ['nature', 'science', 'animal', 'plant', 'water', 'sky', 'earth', 'sun', 'moon', 'star', 'weather', 'rain', 'wind', 'tree', 'flower', 'mountain']
    },
    't06_abstract_추상과_논리': {
        'title': '추상과 논리 (抽象与逻辑)',
        'keywords': ['think', 'understand', 'reason', 'logic', 'true', 'false', 'right', 'wrong', 'possible', 'impossible', 'necessary', 'important', 'mean', 'matter', 'sense']
    }
}

# 통합 번역 딕셔너리
translation_dict = {
    # 주요 다단어 표현들 (먼저 매칭됨)
    'to accompany': '동반하다',
    'keep sb company': '함께하다',
    'in charge': '담당하다',
    'person in charge': '담당자',
    'responsible for': '책임지다',
    'to complete a contract': '계약을 성립하다',
    'reach a deal': '거래하다',
    'to keep company with': '함께하다',
    'buying and selling': '매매',
    'business and trade': '거래',
    'having sb do': '~하게 하다',
    'to sound an alarm': '경보하다',
    'move along one\'s course': '운행하다',
    'religious service': '예배',
    'to attend a religious service': '예배하다',
    'business trip': '출장',
    'on duty': '근무',
    'to purchase': '구입하다',
    'to undertake': '맡다',
    'harmony and prosperity': '번영',
    'hardworking and diligent': '근면한',
    'real estate': '부동산',

    # 단일 단어들
    'accompany': '동반하다',
    'complete': '완성하다',
    'nerve': '신경',
    'exhausting': '피곤한',
    'manage': '관리하다',
    'serve': '봉사하다',
    'customer': '고객',
    'client': '고객',
    'company': '회사',
    'business': '사업',
    'market': '시장',
    'economy': '경제',
    'profit': '이익',
    'profits': '이익',
    'contract': '계약',
    'meeting': '회의',
    'work': '일',
    'job': '직업',
    'report': '보고',
    'sales': '판매',
    'society': '사회',
    'culture': '문화',
    'tradition': '전통',
    'custom': '관습',
    'festival': '축제',
    'art': '예술',
    'history': '역사',
    'education': '교육',
    'news': '뉴스',
    'media': '매체',
    'happy': '행복한',
    'sad': '슬픈',
    'angry': '화난',
    'afraid': '두려운',
    'love': '사랑',
    'hate': '증오',
    'like': '좋아하다',
    'emotion': '감정',
    'feel': '느끼다',
    'think': '생각하다',
    'worry': '걱정하다',
    'nature': '자연',
    'science': '과학',
    'animal': '동물',
    'plant': '식물',
    'water': '물',
    'sky': '하늘',
    'sun': '태양',
    'moon': '달',
    'star': '별',
    'weather': '날씨',
    'rain': '비',
    'wind': '바람',
    'tree': '나무',
    'flower': '꽃',
    'understand': '이해하다',
    'reason': '이유',
    'logic': '논리',
    'true': '참',
    'false': '거짓',
    'right': '맞다',
    'wrong': '틀렸다',
    'possible': '가능한',
    'necessary': '필요한',
    'important': '중요한',
    'shoot': '발사하다',
    'hall': '홀',
    'return': '돌아가다',
    'segment': '구간',
    'arrive': '도착하다',
    'chairman': '회장',
    'user': '사용자',
    'position': '직위',
    'lapse': '실수',
    'serviceman': '군인',
    'master': '장인',
    'leisure': '여가',
    'post': '직책',
    'trademark': '상표',
    'property': '부동산',
    'workday': '근무일',
    'handicraft': '공예품',
    'mailbox': '우편함',
    'govern': '통치하다',
    'usable': '사용 가능한',
    'workable': '가능한',
    'feasible': '가능한',
    'doable': '가능한',
    'to make': '~하게 하다',
    'to cause': '야기하다',
    'first of the ten heavenly stems': '갑',
    'to enjoy': '즐기다',
    'to appreciate': '감상하다',
    'to regret': '후회하다',
    'misfortune': '불행',
    'brains': '두뇌',
    'to point out': '지적하다',
    'to complain': '불평하다',
    'classifier': '개',
    'small spheres': '구슬',
    'for': '위해',
    'a': '하나',
    'like': '좋아하다',
    'fear': '두려움',
    'sad': '슬프다',
    'to cheat': '속이다',
    'to spit': '뱉다',
    'to start': '시작하다',
    'to bear': '견디다',
    'article': '물품',
    'to sign': '서명하다',
    'satellite': '위성',
    'to throw': '던지다',
    'to break': '깨지다',
    'to dry': '말리다',
    'soft': '부드럽다',
    'hard': '딱딱한',
    'bitter': '쓸개',
    'sweet': '달콤한',
}

def translate_text(eng_text):
    """영어 텍스트 번역"""
    if not eng_text:
        return "정보 없음"

    # 첫 의미 추출
    first = eng_text.split(';')[0].strip()
    first = re.sub(r'\([^)]*\)', '', first).strip()

    # 먼저 2단어 이상 조합 확인
    words = first.lower().split()
    for i in range(len(words), 0, -1):
        for j in range(len(words) - i + 1):
            phrase = ' '.join(words[j:j+i])
            clean_phrase = re.sub(r'[.,;:]', '', phrase)
            if clean_phrase in translation_dict:
                return translation_dict[clean_phrase]

    # 단어별 확인 (길이 3자 이상만 - 너무 짧은 단어 제외)
    for word in words:
        clean = word.rstrip('.,;:')
        if len(clean) >= 3 and clean in translation_dict:
            return translation_dict[clean]

    return first[:35]

def get_radical_breakdown(hanzi):
    """한자 분석"""
    # 간단한 한자별 의미
    hanzi_meanings = {
        '的': '~의',
        '是': '이다, ~이다',
        '不': '아니다',
        '了': '완료',
        '在': '있다, 위치',
        '有': '있다, 가지다',
        '和': '그리고',
        '人': '사람',
        '这': '이것',
        '中': '중간, 중국',
        '大': '크다',
        '为': '하다, 위해',
        '以': '이용하여',
        '个': '개',
        '地': '땅, 지역',
        '到': '도달하다',
        '说': '말하다',
        '生': '생기다, 생산',
        '年': '해, 년',
        '去': '가다',
        '好': '좋다',
        '把': '잡다',
        '他': '그',
        '家': '집, 가정',
        '子': '아들, 자',
        '女': '여자',
        '日': '날, 일',
        '月': '달, 월',
        '火': '불',
        '水': '물',
        '木': '나무',
        '金': '금, 쇠',
        '土': '흙',
        '心': '마음',
        '口': '입',
        '手': '손',
        '足': '발',
    }

    if hanzi in hanzi_meanings:
        return f"{hanzi}({hanzi_meanings[hanzi]})"
    return f"{hanzi}(한자)"

# 각 테마별 파일 재생성
for theme_key, theme_info in theme_config.items():
    # 키워드로 단어 필터링
    theme_words = []
    for w in hsk5_words:
        meaning_en = w.get('meaningEn', '').lower()
        for kw in theme_info['keywords']:
            if kw.lower() in meaning_en:
                theme_words.append(w)
                break

    theme_words = theme_words[:150]

    print(f"[재생성 중] {theme_key}: {len(theme_words)}개")

    # 파일 생성
    filename = f"{theme_key}.md"
    output_path = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Mid") / filename

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"# {theme_info['title']}\n\n")
        f.write(f"> 상황: HSK 5급 단어 중 {theme_info['title'].split('(')[0].strip()}\n")
        f.write(f"> 수준: HSK 5급 중심\n")
        f.write(f"> 단어 수: {len(theme_words)}개\n\n")
        f.write("---\n\n")

        for idx, word_data in enumerate(theme_words, 1):
            hanzi = word_data.get('word', '')
            pinyin = word_data.get('pinyin', '')
            meaning_en = word_data.get('meaningEn', '')
            meaning_ko = translate_text(meaning_en)
            hsk_level = word_data.get('hskLevel', '')
            word_id = word_data.get('id', '')

            # 품사
            pos_list = word_data.get('pos', [])
            pos_map = {'n': '명사', 'v': '동사', 'a': '형용사', 'd': '부사', 'r': '대명사', 'u': '조사'}
            pos_ko = pos_map.get(pos_list[0] if pos_list else 'n', '명사')

            # 한자 분석
            radical_desc = ' + '.join([get_radical_breakdown(c) for c in hanzi])

            f.write(f"### {idx}. {hanzi} / {pinyin} / [{pos_ko}] / {meaning_ko}\n\n")
            f.write(f"- 한자 풀이:\n")
            f.write(f"  - {radical_desc} → {meaning_ko}\n")
            f.write(f"- HSK 등급: {hsk_level}급\n\n")
            f.write(f"<!-- id: {word_id} -->\n\n")
            f.write("---\n\n")

print("\n=== 재생성 완료 ===")
