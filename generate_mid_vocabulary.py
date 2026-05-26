import json
import re

# HSK 5급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_text = f.read()
    words_data = json.loads(words_text)

# HSK 5급 단어 필터링
hsk5_words = [w for w in words_data if w.get('hskLevel') == 5]
print(f"HSK 5급 단어 수: {len(hsk5_words)}\n")

# 테마별 키워드 및 한국어 뜻 매핑 (간단한 영어→한국어)
theme_config = {
    't01_daily_일상과_구어': {
        'title': '일상과 구어 (日常与口语)',
        'keywords': ['say', 'talk', 'chat', 'casual', 'daily', 'ordinary', 'regular', 'common', 'usually', 'simply', 'just', 'anyway', 'probably', 'suddenly', 'gradually', 'speak', 'language', 'conversation'],
        'filename': 't01_daily_일상과_구어.md'
    },
    't02_work_직장과_경제': {
        'title': '직장과 경제 (职场与经济)',
        'keywords': ['company', 'business', 'manage', 'employee', 'salary', 'market', 'economy', 'finance', 'invest', 'trade', 'profit', 'customer', 'contract', 'project', 'report', 'meeting', 'work', 'office', 'job'],
        'filename': 't02_work_직장과_경제.md'
    },
    't03_society_사회와_문화': {
        'title': '사회와 문화 (社会与文化)',
        'keywords': ['society', 'community', 'culture', 'tradition', 'custom', 'festival', 'art', 'history', 'education', 'news', 'media', 'public', 'citizen', 'religion', 'ceremony'],
        'filename': 't03_society_사회와_문화.md'
    },
    't04_emotion_감정과_심리': {
        'title': '감정과 심리 (情感与心理)',
        'keywords': ['happy', 'sad', 'angry', 'fear', 'love', 'hate', 'feel', 'emotion', 'mood', 'heart', 'mind', 'think', 'worry', 'excited'],
        'filename': 't04_emotion_감정과_심리.md'
    },
    't05_nature_자연과_과학': {
        'title': '자연과 과학 (自然与科学)',
        'keywords': ['nature', 'science', 'animal', 'plant', 'water', 'sky', 'earth', 'sun', 'moon', 'star', 'weather', 'rain', 'wind', 'tree', 'flower'],
        'filename': 't05_nature_자연과_과학.md'
    },
    't06_abstract_추상과_논리': {
        'title': '추상과 논리 (抽象与逻辑)',
        'keywords': ['think', 'understand', 'reason', 'logic', 'true', 'false', 'right', 'wrong', 'possible', 'impossible', 'necessary', 'important', 'mean', 'matter'],
        'filename': 't06_abstract_추상과_논리.md'
    }
}

# 간단한 영어→한국어 번역 딕셔너리
simple_translation = {
    'of': '의',
    'and': '그리고',
    'the': '그',
    'to': '에게',
    'say': '말하다',
    'talk': '이야기하다',
    'chat': '수다떨다',
    'speak': '말하다',
    'hello': '안녕하세요',
    'thank': '감사하다',
    'like': '좋아하다',
    'love': '사랑하다',
    'know': '알다',
    'want': '원하다',
    'need': '필요하다',
    'work': '일하다',
    'study': '공부하다',
    'buy': '사다',
    'sell': '팔다',
    'eat': '먹다',
    'drink': '마시다',
    'go': '가다',
    'come': '오다',
}

# 부수 설명 딕셔너리
radical_meanings = {
    '女': '계집녀',
    '子': '아들자',
    '人': '사람인',
    '亻': '사람인변',
    '口': '입구',
    '心': '마음심',
    '忄': '심방변',
    '木': '나무목',
    '火': '불화',
    '水': '물수',
    '金': '쇠금',
    '土': '흙토',
    '日': '해일',
    '月': '달월',
    '目': '눈목',
    '手': '손수',
    '足': '발족',
    '头': '머리두',
    '頭': '머리두',
}

def extract_korean_meaning(english_meaning):
    """간단한 영어 뜻에서 첫 한국어 단어 추출"""
    # 첫 부분만 추출
    if not english_meaning:
        return "뜻 정보 없음"

    # 첫 번째 의미만 추출
    first_meaning = english_meaning.split(';')[0].strip()
    # 괄호 안의 설명 제거
    first_meaning = re.sub(r'\([^)]*\)', '', first_meaning).strip()
    return first_meaning[:30] if len(first_meaning) > 30 else first_meaning

def get_radical_info(word, radical):
    """부수 정보 기반 한자 풀이 생성"""
    # 간단한 부수 설명 (실제로는 더 많은 데이터 필요)
    radical_meanings = {
        '女': '계집녀',
        '子': '아들자',
        '人': '사람인',
        '亻': '사람인변',
        '口': '입구',
        '心': '마음심',
        '忄': '심방변',
        '木': '나무목',
        '火': '불화',
        '水': '물수',
        '金': '쇠금',
        '土': '흙토',
        '日': '해일',
        '月': '달월',
        '目': '눈목',
        '手': '손수',
        '足': '발족',
        '头': '머리두',
        '頭': '머리두',
    }
    return f"(구성: {radical_meanings.get(radical, radical)})"

# 각 테마별로 마크다운 생성
for theme_key, theme_info in theme_config.items():
    # 키워드로 관련 단어 필터링
    theme_words = []
    for word_data in hsk5_words:
        meaning_en = word_data.get('meaningEn', '').lower()
        for keyword in theme_info['keywords']:
            if keyword.lower() in meaning_en:
                theme_words.append(word_data)
                break

    # 최대 50개 단어만 선택
    theme_words = theme_words[:50]

    print(f"[생성 중] {theme_info['filename']}: {len(theme_words)}개 단어")

    # 마크다운 생성
    output_path = rf"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Mid\{theme_info['filename']}"

    with open(output_path, 'w', encoding='utf-8') as f:
        # 헤더
        f.write(f"# {theme_info['title']}\n\n")
        f.write(f"> 상황: HSK 5급 단어 중 {theme_info['title'].split('(')[0].strip()}\n")
        f.write(f"> 수준: HSK 5급 중심\n")
        f.write(f"> 단어 수: {len(theme_words)}개\n\n")
        f.write("---\n\n")

        # 단어 목록
        for idx, word_data in enumerate(theme_words, 1):
            hanzi = word_data.get('word', '')
            pinyin = word_data.get('pinyin', '')
            meaning_en = word_data.get('meaningEn', '')
            meaning_ko = extract_korean_meaning(meaning_en)
            hsk_level = word_data.get('hskLevel', '')
            radical = word_data.get('radical', '')
            word_id = word_data.get('id', '')

            # 품사 변환
            pos_list = word_data.get('pos', [])
            pos_korean = '명사'  # 기본값
            if pos_list:
                pos_map = {'n': '명사', 'v': '동사', 'a': '형용사', 'd': '부사', 'r': '대명사'}
                pos_korean = pos_map.get(pos_list[0], '명사')

            f.write(f"### {idx}. {hanzi} / {pinyin} / [{pos_korean}] / {meaning_ko}\n\n")
            f.write(f"- 한자 풀이:\n")
            f.write(f"  - {hanzi}: {radical_meanings.get(radical, radical)} → {meaning_ko}\n")
            f.write(f"- HSK 등급: {hsk_level}급\n\n")
            f.write(f"<!-- id: {word_id} -->\n\n")
            f.write("---\n\n")

print("\n=== 생성 완료 ===")
