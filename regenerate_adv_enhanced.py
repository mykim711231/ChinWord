import json
import re
from pathlib import Path

# HSK 6-9급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_data = json.loads(f.read())

# HSK 6-9급 단어 필터링
adv_words = [w for w in words_data if w.get('hskLevel') in [6, 7, 8, 9]]

# 확대된 통합 번역 딕셔너리
translation_dict = {
    # 다단어 표현
    'to accompany': '동반하다',
    'sound of singing': '노래 소리',
    'used for': '사용하다',
    'variant of': '변형',
    'surname': '성',
    'other than': '이외에',
    'to exceed': '초과하다',
    'in general': '일반적으로',
    'by oneself': '혼자',
    'one another': '서로',

    # 기초 동사들
    'say': '말하다',
    'talk': '이야기하다',
    'speak': '말하다',
    'tell': '말해주다',
    'ask': '묻다',
    'answer': '대답하다',
    'listen': '듣다',
    'hear': '들리다',
    'read': '읽다',
    'write': '쓰다',
    'draw': '그리다',
    'paint': '칠하다',
    'build': '짓다',
    'make': '만들다',
    'do': '하다',
    'go': '가다',
    'come': '오다',
    'walk': '걷다',
    'run': '뛰다',
    'jump': '뛰다',
    'sit': '앉다',
    'stand': '서다',
    'lie': '누우다',
    'sleep': '자다',
    'wake': '깨다',
    'eat': '먹다',
    'drink': '마시다',
    'cook': '요리하다',
    'buy': '사다',
    'sell': '팔다',
    'pay': '지불하다',
    'give': '주다',
    'take': '가져가다',
    'hold': '잡다',
    'let': '놓다',
    'open': '열다',
    'close': '닫다',
    'turn': '돌리다',
    'move': '움직이다',
    'stop': '멈추다',
    'wait': '기다리다',
    'look': '보다',
    'see': '보다',
    'watch': '관찰하다',
    'show': '보여주다',
    'hide': '숨기다',
    'find': '찾다',
    'lose': '잃다',
    'search': '찾다',
    'follow': '따라가다',
    'lead': '이끌다',
    'guide': '안내하다',
    'teach': '가르치다',
    'learn': '배우다',
    'know': '알다',
    'forget': '잊다',
    'remember': '기억하다',
    'think': '생각하다',
    'believe': '믿다',
    'doubt': '의심하다',
    'trust': '신뢰하다',
    'understand': '이해하다',
    'feel': '느끼다',
    'want': '원하다',
    'need': '필요하다',
    'like': '좋아하다',
    'love': '사랑하다',
    'hate': '싫어하다',
    'fear': '두려워하다',
    'enjoy': '즐기다',
    'use': '사용하다',
    'try': '시도하다',
    'help': '돕다',
    'hurt': '상처주다',
    'grow': '자라다',
    'live': '살다',
    'die': '죽다',
    'play': '놀다',
    'work': '일하다',
    'rest': '쉬다',
    'swim': '수영하다',
    'dance': '춤을 추다',
    'sing': '노래하다',
    'laugh': '웃다',
    'cry': '울다',
    'smile': '웃다',
    'fight': '싸우다',
    'win': '이기다',
    'lose': '지다',

    # 명사들
    'person': '사람',
    'people': '사람들',
    'man': '남자',
    'woman': '여자',
    'child': '아이',
    'baby': '아기',
    'friend': '친구',
    'family': '가족',
    'parent': '부모',
    'mother': '어머니',
    'father': '아버지',
    'brother': '형제',
    'sister': '자매',
    'time': '시간',
    'day': '날',
    'night': '밤',
    'morning': '아침',
    'afternoon': '오후',
    'evening': '저녁',
    'week': '주',
    'month': '달',
    'year': '해',
    'season': '계절',
    'spring': '봄',
    'summer': '여름',
    'fall': '가을',
    'winter': '겨울',
    'weather': '날씨',
    'sun': '태양',
    'moon': '달',
    'star': '별',
    'cloud': '구름',
    'rain': '비',
    'snow': '눈',
    'wind': '바람',
    'thunder': '천둥',
    'lightning': '번개',
    'tree': '나무',
    'flower': '꽃',
    'grass': '풀',
    'leaf': '잎',
    'animal': '동물',
    'dog': '개',
    'cat': '고양이',
    'bird': '새',
    'fish': '물고기',
    'insect': '곤충',
    'house': '집',
    'home': '집',
    'room': '방',
    'door': '문',
    'window': '창문',
    'wall': '벽',
    'floor': '바닥',
    'ceiling': '천장',
    'table': '탁자',
    'chair': '의자',
    'bed': '침대',
    'sofa': '소파',
    'kitchen': '부엌',
    'bathroom': '욕실',
    'bedroom': '침실',
    'school': '학교',
    'university': '대학',
    'office': '사무실',
    'hospital': '병원',
    'store': '가게',
    'market': '시장',
    'restaurant': '식당',
    'hotel': '호텔',
    'airport': '공항',
    'train': '기차',
    'bus': '버스',
    'car': '자동차',
    'bike': '자전거',
    'boat': '보트',
    'plane': '비행기',
    'money': '돈',
    'price': '가격',
    'food': '음식',
    'water': '물',
    'milk': '우유',
    'juice': '주스',
    'coffee': '커피',
    'tea': '차',
    'bread': '빵',
    'rice': '쌀',
    'meat': '고기',
    'chicken': '닭고기',
    'beef': '소고기',
    'pork': '돼지고기',
    'book': '책',
    'newspaper': '신문',
    'magazine': '잡지',
    'movie': '영화',
    'music': '음악',
    'song': '노래',
    'picture': '사진',
    'painting': '그림',
    'computer': '컴퓨터',
    'phone': '전화',
    'television': '텔레비전',
    'radio': '라디오',
    'camera': '카메라',

    # 형용사들
    'good': '좋다',
    'bad': '나쁘다',
    'big': '크다',
    'small': '작다',
    'long': '길다',
    'short': '짧다',
    'tall': '크다',
    'wide': '넓다',
    'narrow': '좁다',
    'thick': '두껍다',
    'thin': '얇다',
    'heavy': '무겁다',
    'light': '가볍다',
    'strong': '강하다',
    'weak': '약하다',
    'fast': '빠르다',
    'slow': '느리다',
    'hot': '뜨겁다',
    'cold': '춥다',
    'warm': '따뜻하다',
    'cool': '시원하다',
    'wet': '젖다',
    'dry': '마르다',
    'clean': '깨끗하다',
    'dirty': '더럽다',
    'beautiful': '아름답다',
    'ugly': '못생겼다',
    'new': '새로운',
    'old': '오래된',
    'young': '젊다',
    'rich': '부유한',
    'poor': '가난한',
    'happy': '행복한',
    'sad': '슬픈',
    'angry': '화난',
    'surprised': '놀란',
    'afraid': '두려운',
    'tired': '피곤한',
    'healthy': '건강한',
    'sick': '아픈',
    'smart': '똑똑한',
    'kind': '친절한',
    'cruel': '잔인한',
    'honest': '정직한',
    'other': '다른',

    # 기타
    'color': '색',
    'red': '빨강',
    'blue': '파랑',
    'green': '초록',
    'yellow': '노랑',
    'black': '검정',
    'white': '하얀',
    'number': '숫자',
    'country': '국가',
    'city': '도시',
    'street': '거리',
    'road': '길',
    'bridge': '다리',
    'mountain': '산',
    'river': '강',
    'ocean': '바다',
    'beach': '해변',
    'forest': '숲',
    'desert': '사막',
    'law': '법',
    'rule': '규칙',
    'right': '권리',
    'duty': '의무',
    'war': '전쟁',
    'peace': '평화',
    'education': '교육',
    'culture': '문화',
    'tradition': '전통',
    'art': '예술',
    'science': '과학',
    'technology': '기술',
    'business': '사업',
    'company': '회사',
    'worker': '근로자',
    'job': '직업',
    'salary': '급여',
    'profit': '이익',
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

    # 단어별 확인 (길이 3자 이상만)
    for word in words:
        clean = word.rstrip('.,;:')
        if len(clean) >= 3 and clean in translation_dict:
            return translation_dict[clean]

    return first[:35]

def get_radical_breakdown(hanzi):
    """한자 분석"""
    hanzi_meanings = {
        '与': '함께',
        '啦': '소리',
        '于': '곳',
        '如': '같다',
        '同': '같다',
        '作': '하다',
        '有': '가지다',
        '另': '다른',
        '嘛': '소리',
        '超': '초월',
    }

    if hanzi in hanzi_meanings:
        return f"{hanzi}({hanzi_meanings[hanzi]})"
    return f"{hanzi}(한자)"

# 파일 생성 (d01-d68, 약 100개씩)
words_per_file = 100
total_files = (len(adv_words) + words_per_file - 1) // words_per_file

print(f"Regenerating Adv vocabulary files: d01-d{total_files:02d}")

for file_num in range(1, total_files + 1):
    start_idx = (file_num - 1) * words_per_file
    end_idx = min(start_idx + words_per_file, len(adv_words))
    file_words = adv_words[start_idx:end_idx]

    filename = f"d{file_num:02d}_Top.md"
    output_path = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Adv") / filename

    start_rank = start_idx + 1
    end_rank = end_idx

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"# 상위 {start_rank}–{end_rank}위 (HSK 6-7급)\n\n")
        f.write(f"> 순위: {start_rank}–{end_rank}\n")
        f.write(f"> 수준: HSK 6-7급 빈출\n")
        f.write(f"> 단어 수: {len(file_words)}개\n\n")
        f.write("---\n\n")

        for idx, word_data in enumerate(file_words, 1):
            actual_rank = start_idx + idx
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

            f.write(f"### {actual_rank}. {hanzi} / {pinyin} / [{pos_ko}] / {meaning_ko}\n\n")
            f.write(f"- 한자 풀이:\n")
            f.write(f"  - {radical_desc} → {meaning_ko}\n")
            f.write(f"- HSK 등급: {hsk_level}급\n\n")
            f.write(f"<!-- id: {word_id} -->\n\n")
            f.write("---\n\n")

    if file_num % 10 == 0:
        print(f"[생성 중] {filename}: {len(file_words)}개")

print(f"\n=== 재생성 완료 ({total_files}개 파일) ===")
