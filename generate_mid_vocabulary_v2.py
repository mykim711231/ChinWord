import json
import re

# HSK 5급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_text = f.read()
    words_data = json.loads(words_text)

# HSK 5급 단어 필터링
hsk5_words = [w for w in words_data if w.get('hskLevel') == 5]
print(f"HSK 5급 단어 수: {len(hsk5_words)}\n")

# 테마별 키워드 및 설정
theme_config = {
    't01_daily_일상과_구어': {
        'title': '일상과 구어 (日常与口语)',
        'keywords': ['say', 'talk', 'chat', 'casual', 'daily', 'ordinary', 'regular', 'common', 'usually', 'simply', 'just', 'anyway', 'probably', 'suddenly', 'gradually', 'speak', 'language', 'conversation', 'word', 'voice'],
        'filename': 't01_daily_일상과_구어.md'
    },
    't02_work_직장과_경제': {
        'title': '직장과 경제 (职场与经济)',
        'keywords': ['company', 'business', 'manage', 'employee', 'salary', 'market', 'economy', 'finance', 'invest', 'trade', 'profit', 'customer', 'contract', 'project', 'report', 'meeting', 'work', 'office', 'job', 'service', 'sell', 'buy'],
        'filename': 't02_work_직장과_경제.md'
    },
    't03_society_사회와_문화': {
        'title': '사회와 문화 (社会与文化)',
        'keywords': ['society', 'community', 'culture', 'tradition', 'custom', 'festival', 'art', 'history', 'education', 'news', 'media', 'public', 'citizen', 'religion', 'ceremony', 'performance', 'exhibition', 'social'],
        'filename': 't03_society_사회와_문화.md'
    },
    't04_emotion_감정과_심리': {
        'title': '감정과 심리 (情感与心理)',
        'keywords': ['happy', 'sad', 'angry', 'fear', 'love', 'hate', 'feel', 'emotion', 'mood', 'heart', 'mind', 'think', 'worry', 'excited', 'joy', 'sorrow', 'anxiety', 'calm'],
        'filename': 't04_emotion_감정과_심리.md'
    },
    't05_nature_자연과_과학': {
        'title': '자연과 과학 (自然与科学)',
        'keywords': ['nature', 'science', 'animal', 'plant', 'water', 'sky', 'earth', 'sun', 'moon', 'star', 'weather', 'rain', 'wind', 'tree', 'flower', 'mountain', 'river', 'sea'],
        'filename': 't05_nature_자연과_과학.md'
    },
    't06_abstract_추상과_논리': {
        'title': '추상과 논리 (抽象与逻辑)',
        'keywords': ['think', 'understand', 'reason', 'logic', 'true', 'false', 'right', 'wrong', 'possible', 'impossible', 'necessary', 'important', 'mean', 'matter', 'sense', 'idea', 'theory'],
        'filename': 't06_abstract_추상과_논리.md'
    }
}

# 상세한 영어→한국어 번역 딕셔너리
english_to_korean = {
    # 동사
    'accompany': '동반하다, 따라다니다',
    'complete': '완성하다, 끝내다',
    'usable': '사용 가능한',
    'sound': '울리다, 발성하다',
    'alarm': '경보, 알람',
    'manage': '관리하다, 경영하다',
    'operate': '운영하다, 작동하다',
    'maintain': '유지하다, 보수하다',
    'work': '일하다, 작동하다',
    'study': '공부하다, 연구하다',
    'teach': '가르치다',
    'learn': '배우다, 학습하다',
    'understand': '이해하다, 알다',
    'know': '알다, 인식하다',
    'think': '생각하다, 사고하다',
    'feel': '느끼다, 감지하다',
    'love': '사랑하다, 좋아하다',
    'hate': '싫어하다, 증오하다',
    'like': '좋아하다, 즐기다',
    'want': '원하다, 바라다',
    'need': '필요하다, 필요로 하다',
    'hope': '바라다, 희망하다',
    'wish': '바라다, 소원하다',
    'try': '시도하다, 노력하다',
    'attempt': '시도하다',
    'ensure': '보장하다, 확실히 하다',
    'develop': '개발하다, 발전하다',
    'grow': '자라다, 증가하다',
    'increase': '증가하다, 늘리다',
    'decrease': '감소하다, 줄이다',
    'improve': '개선하다, 향상하다',
    'change': '바꾸다, 변화하다',
    'become': '되다, 변하다',
    'create': '만들다, 창조하다',
    'produce': '생산하다, 만들다',
    'provide': '제공하다, 공급하다',
    'offer': '제시하다, 바치다',
    'give': '주다, 제공하다',
    'take': '취하다, 가져가다',
    'get': '얻다, 가져오다',
    'make': '만들다',
    'build': '건설하다, 세우다',
    'form': '형성하다, 구성하다',
    'start': '시작하다, 시작하다',
    'begin': '시작하다',
    'end': '끝나다, 종료하다',
    'finish': '마치다, 끝내다',
    'stop': '멈추다, 그만하다',
    'continue': '계속하다, 지속하다',
    'go': '가다, 진행하다',
    'come': '오다, 도착하다',
    'move': '움직이다, 이동하다',
    'stay': '머물다, 남다',
    'remain': '남다, 머물다',
    'leave': '떠나다, 출발하다',
    'enter': '들어가다, 진입하다',
    'exit': '나가다, 퇴출하다',
    'reach': '도달하다, 이르다',
    'arrive': '도착하다, 나타나다',
    'return': '돌아가다, 복귀하다',
    'pass': '지나가다, 통과하다',
    'cross': '건너다, 지나다',
    'climb': '오르다, 올라가다',
    'descend': '내려가다, 하강하다',
    'rise': '올라가다, 상승하다',
    'fall': '떨어지다, 하락하다',
    'sit': '앉다',
    'stand': '서다',
    'lie': '누우다',
    'walk': '걷다, 산책하다',
    'run': '달리다, 뛰다',
    'jump': '뛰다, 점프하다',
    'dance': '춤을 추다',
    'sing': '노래하다',
    'play': '놀다, 연주하다',
    'eat': '먹다',
    'drink': '마시다',
    'taste': '맛보다',
    'smell': '냄새를 맡다',
    'see': '보다',
    'look': '보다, 살펴보다',
    'watch': '지켜보다, 감시하다',
    'listen': '듣다',
    'hear': '들리다, 듣다',
    'speak': '말하다, 이야기하다',
    'say': '말하다',
    'talk': '말하다, 대화하다',
    'tell': '말하다, 말해주다',
    'ask': '묻다, 질문하다',
    'answer': '대답하다, 응답하다',
    'reply': '대답하다, 회신하다',
    'agree': '동의하다, 일치하다',
    'disagree': '불동의하다',
    'accept': '받아들이다',
    'reject': '거절하다, 거부하다',
    'refuse': '거절하다, 거부하다',
    'allow': '허락하다, 허용하다',
    'permit': '허가하다',
    'forbid': '금지하다',
    'command': '명령하다',
    'order': '명령하다, 주문하다',
    'demand': '요구하다, 청구하다',
    'request': '요청하다',
    'suggest': '제안하다',
    'propose': '제안하다',
    'recommend': '추천하다',
    'advise': '충고하다, 조언하다',
    'warn': '경고하다',
    'guide': '안내하다, 지도하다',
    'lead': '이끌다, 지도하다',
    'follow': '따르다, 뒤따르다',
    'obey': '순종하다',
    'serve': '섬기다, 봉사하다',
    'help': '돕다, 도움을 주다',
    'assist': '돕다, 보조하다',
    'support': '지지하다, 지원하다',
    'protect': '보호하다, 보살피다',
    'defend': '방어하다, 옹호하다',
    'attack': '공격하다, 습격하다',
    'fight': '싸우다, 투쟁하다',
    'struggle': '투쟁하다, 애쓰다',
    'compete': '경쟁하다',
    'win': '이기다, 우승하다',
    'lose': '잃다, 패하다',
    'defeat': '격퇴하다, 패배시키다',
    'beat': '이기다, 치다',
    'catch': '잡다, 포착하다',
    'grab': '잡다, 움켜쥐다',
    'hold': '잡다, 들다',
    'release': '놓다, 해제하다',
    'let': '놓다, 허락하다',
    'push': '밀다, 누르다',
    'pull': '당기다, 잡아당기다',
    'throw': '던지다, 투척하다',
    'catch': '받다, 포착하다',
    'carry': '운반하다, 나르다',
    'bring': '가져오다, 데려오다',
    'take': '가져가다, 잡다',
    'send': '보내다, 발송하다',
    'receive': '받다, 수령하다',
    'deliver': '전달하다, 배달하다',
    'receive': '받다, 수받다',
    'buy': '사다, 구매하다',
    'sell': '팔다, 판매하다',
    'pay': '지불하다, 돈을 내다',
    'charge': '요금을 받다, 부과하다',
    'cost': '비용이 들다',
    'expense': '비용, 지출',
    'money': '돈, 화폐',
    'profit': '이익, 수익',
    'loss': '손실, 손해',
    'gain': '얻다, 이익',
    'benefit': '이득, 도움',
    'suffer': '겪다, 고통받다',
    'damage': '손상시키다, 피해',
    'repair': '수리하다, 고치다',
    'fix': '고정하다, 고치다',
    'break': '깨다, 부수다',
    'destroy': '파괴하다, 훼손하다',
    'build': '건설하다, 세우다',
    'construct': '건설하다, 구성하다',
    'demolish': '철거하다, 파괴하다',
    'clean': '청소하다, 깨끗이 하다',
    'dirty': '더럽혀지다, 때묻다',
    'wash': '씻다, 세탁하다',
    'dry': '말리다, 건조하다',
    'wet': '적시다, 젖다',
    'heat': '데우다, 가열하다',
    'cool': '식히다, 냉각하다',
    'freeze': '얼리다, 동결하다',
    'melt': '녹다, 용해하다',
    'burn': '태우다, 연소하다',
    'boil': '끓이다, 비등하다',
    'cook': '요리하다, 조리하다',
    'prepare': '준비하다, 마련하다',
    'arrange': '정렬하다, 배열하다',
    'organize': '조직하다, 정리하다',
    'plan': '계획하다, 설계하다',
    'design': '설계하다, 디자인하다',
    'draw': '그리다, 그리기',
    'paint': '칠하다, 그림을 그리다',
    'write': '쓰다, 저술하다',
    'read': '읽다, 독서하다',
    'count': '세다, 계산하다',
    'calculate': '계산하다, 산출하다',
    'measure': '재다, 측정하다',
    'weigh': '무게를 재다, 저울질하다',
    'compare': '비교하다, 대조하다',
    'match': '맞다, 일치하다',
    'differ': '다르다, 차이나다',
    'equal': '같다, 동등하다',
    'same': '같은',
    'different': '다른, 다양한',
    'similar': '비슷한, 유사한',
    'opposite': '반대의',
    'complete': '완전한, 완성되다',
    'whole': '전체의, 온전한',
    'part': '부분, 일부',
    'half': '절반, 반',
    'double': '두배, 배가되다',
    'single': '단일한, 홀로된',
    'multiple': '다중, 여러개',
    'several': '여러, 몇개',
    'many': '많은',
    'few': '적은, 몇개의',
    'some': '일부, 어떤',
    'all': '모든',
    'none': '어느것도 없음',
    'nothing': '아무것도 없음',
    'everything': '모든것',
    'anything': '무엇이든',
    'something': '무언가',
    # 명사
    'client': '고객, 손님',
    'customer': '고객, 소비자',
    'employee': '직원, 종업원',
    'worker': '일꾼, 노동자',
    'manager': '관리자, 매니저',
    'boss': '상사, 보스',
    'staff': '직원, 스태프',
    'team': '팀, 팀',
    'group': '그룹, 집단',
    'company': '회사, 기업',
    'business': '사업, 업무',
    'industry': '산업, 업종',
    'market': '시장, 마켓',
    'trade': '거래, 무역',
    'economy': '경제',
    'finance': '금융, 재무',
    'investment': '투자, 투기',
    'profit': '이익, 수익',
    'loss': '손실, 손해',
    'income': '소득, 수입',
    'salary': '급여, 봉급',
    'wage': '임금, 급료',
    'price': '가격, 값',
    'cost': '비용, 경비',
    'expense': '지출, 비용',
    'budget': '예산, 예산안',
    'account': '계정, 회계',
    'contract': '계약, 약정',
    'agreement': '합의, 동의',
    'deal': '거래, 취급',
    'transaction': '거래, 처리',
    'project': '프로젝트, 사업',
    'task': '과제, 작업',
    'job': '일, 직업',
    'work': '일, 작업',
    'office': '사무실, 사무소',
    'workplace': '직장, 근무지',
    'building': '건물, 빌딩',
    'room': '방, 실',
    'department': '부서, 학과',
    'service': '서비스, 봉사',
    'product': '상품, 제품',
    'goods': '상품, 물건',
    'material': '재료, 자료',
    'resource': '자원, 리소스',
    'supply': '공급, 보급',
    'demand': '수요, 요구',
    'report': '보고, 리포트',
    'meeting': '회의, 모임',
    'conference': '회의, 컨퍼런스',
    'discussion': '논의, 토의',
    'conversation': '대화, 회화',
    'communication': '소통, 통신',
    'message': '메시지, 메모',
    'information': '정보, 정보',
    'data': '데이터, 자료',
    'document': '문서, 서류',
    'record': '기록, 레코드',
    'file': '파일, 철',
    'letter': '편지, 문자',
    'email': '이메일, 전자메일',
    'phone': '전화, 휴대폰',
    'call': '전화, 호출',
    'message': '메시지, 메모',
    'time': '시간, 때',
    'hour': '시간',
    'minute': '분',
    'second': '초',
    'day': '날, 일',
    'week': '주, 주간',
    'month': '달, 월',
    'year': '년, 해',
    'date': '날짜, 일자',
    'schedule': '일정, 스케줄',
    'deadline': '마감, 기한',
    'appointment': '약속, 약정',
    'meeting': '만남, 회의',
    'event': '행사, 이벤트',
    'occasion': '기회, 경우',
    'moment': '순간, 시점',
    'period': '기간, 시기',
    'duration': '기간, 소요시간',
    # 형용사
    'happy': '행복한, 즐거운',
    'sad': '슬픈, 우울한',
    'angry': '화난, 분노한',
    'afraid': '두려운, 무서운',
    'tired': '피곤한, 지친',
    'excited': '신난, 흥분한',
    'bored': '지루한, 심심한',
    'interested': '관심있는',
    'important': '중요한',
    'necessary': '필요한',
    'possible': '가능한',
    'impossible': '불가능한',
    'difficult': '어려운, 힘든',
    'easy': '쉬운, 간단한',
    'good': '좋은, 착한',
    'bad': '나쁜, 악한',
    'beautiful': '아름다운, 예쁜',
    'ugly': '못생긴, 추한',
    'clean': '깨끗한',
    'dirty': '더러운',
    'new': '새로운, 신규',
    'old': '낡은, 오래된',
    'young': '젊은, 어린',
    'strong': '강한, 튼튼한',
    'weak': '약한, 허약한',
    'big': '큰, 거대한',
    'small': '작은, 소형',
    'high': '높은, 상위',
    'low': '낮은, 하위',
    'fast': '빠른, 신속한',
    'slow': '느린, 느슨한',
    'hot': '뜨거운, 뜨듯한',
    'cold': '차가운, 추운',
    'warm': '따뜻한',
    'cool': '시원한, 차가운',
    'wet': '젖은, 축축한',
    'dry': '건조한, 말라있는',
    'thick': '두꺼운, 짙은',
    'thin': '얇은, 삭막한',
    'heavy': '무거운',
    'light': '가벼운, 밝은',
    'bright': '밝은, 명랑한',
    'dark': '어두운, 캄캄한',
    'loud': '시끄러운, 큰소리',
    'quiet': '조용한, 조용함',
    'soft': '부드러운, 고소한',
    'hard': '딱딱한, 견고한',
    'rough': '거친, 거울거울한',
    'smooth': '부드러운, 매끈한',
    'sharp': '날카로운, 예리한',
    'dull': '무딘, 흐릿한',
    'sweet': '달콤한',
    'bitter': '쓴, 씁쓸한',
    'sour': '신, 시큼한',
    'salty': '짠, 염분있는',
    'spicy': '맵다, 자극적',
    'rich': '풍부한, 부유한',
    'poor': '가난한, 빈약한',
    'expensive': '비싼, 고가',
    'cheap': '싼, 저렴한',
    'common': '흔한, 일반적',
    'rare': '드문, 희귀한',
    'normal': '정상적, 보통',
    'strange': '이상한, 낯선',
    'familiar': '친숙한, 익숙한',
    'strange': '낯선, 이상한',
    'obvious': '명백한, 분명한',
    'hidden': '숨은, 감춘',
    'visible': '보이는, 가시적',
    'invisible': '보이지 않는, 눈에 띄지 않는',
    'clear': '명확한, 깨끗한',
    'unclear': '불명확한, 흐린',
    'simple': '단순한, 간단한',
    'complex': '복잡한, 복잡한',
    'pure': '순수한, 깨끗한',
    'mixed': '섞인, 혼합된',
    'natural': '자연스러운, 천연',
    'artificial': '인공적, 인위적',
    'real': '진짜, 실제',
    'false': '거짓, 가짜',
    'true': '참, 진짜',
    'wrong': '틀린, 잘못',
    'right': '맞은, 올바른',
    'correct': '정확한, 맞는',
    'incorrect': '틀린, 부정확한',
    'accurate': '정확한, 정밀한',
    'inaccurate': '부정확한, 부실한',
    'exact': '정확한, 엄밀한',
    'approximate': '대략적, 대충',
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
    '言': '말언',
    '讠': '말언변',
    '食': '먹을식',
    '飞': '날비',
    '飛': '날비',
    '艹': '풀초',
    '辶': '쓸쓸할착',
    '廿': '스무조',
    '廿': '스무조',
    '钅': '쇠금변',
    '贝': '조개패',
    '见': '볼견',
    '儿': '아들자',
    '力': '힘력',
    '冂': '칸감',
    '囗': '울타리엄',
    '宀': '집면',
    '尢': '다리왕',
    '尸': '시체시',
    '山': '뫼산',
    '巛': '물입',
    '工': '공사공',
    '己': '몸기',
    '巾': '수건건',
    '干': '방패간',
    '广': '엄호광',
    '廿': '스무조',
    '廾': '양손한곡',
    '彳': '걸을척',
    '彡': '터럭삼',
    '彳': '걸을척',
    '辶': '쓸쓸할착',
    '寸': '한치촌',
    '小': '작을소',
    '尢': '다리왕',
    '尸': '시체시',
    '屮': '땅지',
    '山': '뫼산',
    '巛': '물입',
    '工': '공사공',
    '己': '몸기',
    '巾': '수건건',
    '干': '방패간',
    '广': '엄호광',
    '廿': '스무조',
    '廾': '양손한곡',
    '彳': '걸을척',
}

def translate_meaning(english_text):
    """영어 뜻을 한국어로 번역"""
    if not english_text:
        return "뜻 정보 없음"

    # 첫 번째 의미만 추출
    first_part = english_text.split(';')[0].strip()
    # 괄호 안의 설명 제거
    first_part = re.sub(r'\([^)]*\)', '', first_part).strip()

    # 주요 단어로 번역
    words = first_part.lower().split()
    translations = []

    for word in words:
        word_clean = word.rstrip('.,:;')
        if word_clean in english_to_korean:
            translations.append(english_to_korean[word_clean])
        elif translations:  # 이미 찾은 번역이 있으면 멈춤
            break

    if translations:
        return translations[0]

    # 매칭되는 단어가 없으면 첫 부분 반환
    return first_part[:40]

def get_radical_description(word):
    """한자 각 글자의 부수 설명 생성"""
    descriptions = []
    for char in word:
        if char in radical_meanings:
            descriptions.append(f"{char}({radical_meanings[char]})")
        else:
            descriptions.append(f"{char}(부수불명)")
    return " + ".join(descriptions) if descriptions else "한자 정보 없음"

# 테마별로 마크다운 생성
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
            meaning_ko = translate_meaning(meaning_en)
            hsk_level = word_data.get('hskLevel', '')
            word_id = word_data.get('id', '')

            # 품사 변환
            pos_list = word_data.get('pos', [])
            pos_korean = '명사'  # 기본값
            if pos_list:
                pos_map = {'n': '명사', 'v': '동사', 'a': '형용사', 'd': '부사', 'r': '대명사', 'u': '조사'}
                pos_korean = pos_map.get(pos_list[0], '명사')

            radical_desc = get_radical_description(hanzi)

            f.write(f"### {idx}. {hanzi} / {pinyin} / [{pos_korean}] / {meaning_ko}\n\n")
            f.write(f"- 한자 풀이:\n")
            f.write(f"  - {radical_desc} → {meaning_ko}\n")
            f.write(f"- HSK 등급: {hsk_level}급\n\n")
            f.write(f"<!-- id: {word_id} -->\n\n")
            f.write("---\n\n")

print("\n=== 생성 완료 ===")
