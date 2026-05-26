import json
import re
from pathlib import Path

# HSK 6-9급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_data = json.loads(f.read())

# HSK 6-9급 단어를 ID로 매핑
adv_by_id = {w['id']: w for w in words_data if w.get('hskLevel') in [6, 7, 8, 9]}

# 확대된 번역 딕셔너리
comprehensive_translation = {
    # 기초 동사
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
    'believe': '믿다',
    'doubt': '의심하다',
    'trust': '신뢰하다',
    'suspect': '의심하다',
    'understand': '이해하다',
    'think': '생각하다',
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
    'match': '경기',
    'game': '게임',
    'sport': '스포츠',
    'friend': '친구',
    'family': '가족',
    'parent': '부모',
    'mother': '어머니',
    'father': '아버지',
    'brother': '형제',
    'sister': '자매',
    'child': '아이',
    'baby': '아기',
    'man': '남자',
    'woman': '여자',
    'person': '사람',
    'people': '사람들',
    'body': '신체',
    'head': '머리',
    'hair': '머리카락',
    'face': '얼굴',
    'eye': '눈',
    'ear': '귀',
    'nose': '코',
    'mouth': '입',
    'tooth': '치아',
    'tongue': '혀',
    'neck': '목',
    'shoulder': '어깨',
    'arm': '팔',
    'hand': '손',
    'finger': '손가락',
    'chest': '가슴',
    'heart': '심장',
    'lung': '폐',
    'stomach': '위',
    'leg': '다리',
    'foot': '발',
    'toe': '발가락',
    'skin': '피부',
    'bone': '뼈',
    'blood': '혈액',
    'clothes': '옷',
    'shirt': '셔츠',
    'pants': '바지',
    'shoe': '신발',
    'hat': '모자',
    'jacket': '자켓',
    'coat': '코트',
    'dress': '드레스',
    'skirt': '스커트',
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
    'living room': '거실',
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
    'fish': '물고기',
    'chicken': '닭고기',
    'beef': '소고기',
    'pork': '돼지고기',
    'vegetable': '채소',
    'fruit': '과일',
    'apple': '사과',
    'orange': '오렌지',
    'banana': '바나나',
    'grape': '포도',
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
    'color': '색상',
    'red': '빨강',
    'blue': '파랑',
    'green': '초록',
    'yellow': '노랑',
    'black': '검정',
    'white': '하얀',
    'size': '크기',
    'big': '크다',
    'small': '작다',
    'long': '길다',
    'short': '짧다',
    'tall': '키가 크다',
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
    'good': '좋다',
    'bad': '나쁘다',
    'new': '새로운',
    'old': '오래된',
    'young': '젊다',
    'old': '늙다',
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
    'stupid': '어리석다',
    'kind': '친절한',
    'cruel': '잔인한',
    'honest': '정직한',
    'dishonest': '부정직한',
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
    'number': '숫자',
    'color': '색',
    'direction': '방향',
    'north': '북쪽',
    'south': '남쪽',
    'east': '동쪽',
    'west': '서쪽',
    'country': '국가',
    'city': '도시',
    'street': '거리',
    'road': '길',
    'bridge': '다리',
    'mountain': '산',
    'river': '강',
    'ocean': '바다',
    'beach': '해변',
    'land': '땅',
    'island': '섬',
    'valley': '계곡',
    'forest': '숲',
    'desert': '사막',
    'law': '법',
    'rule': '규칙',
    'right': '권리',
    'duty': '의무',
    'war': '전쟁',
    'peace': '평화',
    'government': '정부',
    'president': '대통령',
    'minister': '장관',
    'parliament': '의회',
    'religion': '종교',
    'church': '교회',
    'temple': '사찰',
    'mosque': '모스크',
    'art': '예술',
    'literature': '문학',
    'drama': '드라마',
    'poetry': '시',
    'history': '역사',
    'culture': '문화',
    'tradition': '전통',
    'science': '과학',
    'mathematics': '수학',
    'chemistry': '화학',
    'physics': '물리학',
    'biology': '생물학',
    'medicine': '의학',
    'technology': '기술',
    'industry': '산업',
    'agriculture': '농업',
    'economy': '경제',
    'business': '사업',
    'trade': '거래',
    'company': '회사',
    'factory': '공장',
    'shop': '가게',
    'market': '시장',
    'customer': '고객',
    'worker': '근로자',
    'employee': '직원',
    'boss': '상사',
    'salary': '급여',
    'wage': '임금',
    'profit': '이익',
    'loss': '손실',
    'quality': '품질',
    'material': '재료',
    'product': '상품',
    'service': '서비스',
    'method': '방법',
    'skill': '기술',
    'ability': '능력',
    'talent': '재능',
    'knowledge': '지식',
    'idea': '아이디어',
    'opinion': '의견',
    'decision': '결정',
    'choice': '선택',
    'reason': '이유',
    'cause': '원인',
    'result': '결과',
    'effect': '영향',
    'purpose': '목적',
    'goal': '목표',
    'hope': '희망',
    'dream': '꿈',
    'wish': '소원',
    'plan': '계획',
    'project': '프로젝트',
    'task': '과제',
    'problem': '문제',
    'solution': '해결책',
    'difficulty': '어려움',
    'danger': '위험',
    'safety': '안전',
    'health': '건강',
    'disease': '질병',
    'medicine': '약',
    'doctor': '의사',
    'nurse': '간호사',
    'patient': '환자',
    'accident': '사고',
    'injury': '부상',
    'pain': '통증',
    'cure': '치료',
    'education': '교육',
    'school': '학교',
    'teacher': '선생님',
    'student': '학생',
    'lesson': '수업',
    'subject': '과목',
    'exam': '시험',
    'grade': '성적',
    'degree': '학위',
    'diploma': '졸업장',
}

def improved_translation(english_text):
    """개선된 영어→한국어 번역"""
    if not english_text:
        return "뜻 정보 없음"

    # 첫 번째 의미만 추출
    first_part = english_text.split(';')[0].strip()
    first_part = re.sub(r'\([^)]*\)', '', first_part).strip()

    # 먼저 2단어 이상 조합 확인
    words = first_part.lower().split()
    for i in range(len(words), 0, -1):
        for j in range(len(words) - i + 1):
            phrase = ' '.join(words[j:j+i])
            clean_phrase = re.sub(r'[.,;:]', '', phrase)
            if clean_phrase in comprehensive_translation:
                return comprehensive_translation[clean_phrase]

    # 단어별 확인 (길이 3자 이상만)
    for word in words:
        word_clean = word.rstrip('.,:;')
        if len(word_clean) >= 3 and word_clean in comprehensive_translation:
            return comprehensive_translation[word_clean]

    # 매칭 안 되면 원문 첫 부분 반환
    return first_part[:40]

# Adv 폴더의 모든 파일 처리
adv_folder = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Adv")
file_count = 0

for md_file in sorted(adv_folder.glob("d*.md")):
    file_count += 1
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 각 단어 항목 찾기 및 개선
    lines = content.split('\n')
    improved_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # ### N. 단어 형식 찾기
        if line.startswith('### '):
            # 현재 라인의 번역 부분 개선
            match = re.match(r'(### \d+\. .+ / .+ / \[.+\] / )(.+)', line)
            if match:
                prefix = match.group(1)
                current_translation = match.group(2)

                # 원본 영어 의미를 찾기 위해 HSK 데이터 조회
                # ID를 다음 줄들에서 찾기
                j = i + 1
                word_id = None
                while j < len(lines) and j < i + 20:
                    if 'id:' in lines[j]:
                        id_match = re.search(r'id: (hsk_\d+_\d+)', lines[j])
                        if id_match:
                            word_id = id_match.group(1)
                            break
                    j += 1

                # ID로 단어 조회하여 번역 개선
                if word_id and word_id in adv_by_id:
                    word_data = adv_by_id[word_id]
                    meaning_en = word_data.get('meaningEn', '')
                    improved_meaning = improved_translation(meaning_en)
                    improved_lines.append(prefix + improved_meaning)
                else:
                    improved_lines.append(line)
            else:
                improved_lines.append(line)
            i += 1
        else:
            improved_lines.append(line)
            i += 1

    # 개선된 내용 저장
    improved_content = '\n'.join(improved_lines)
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(improved_content)

    if file_count % 10 == 0:
        print(f"  [진행] {md_file.name} 완료 ({file_count}/68)")

print(f"\n=== 모든 Adv 파일 개선 완료 ({file_count}개) ===")
