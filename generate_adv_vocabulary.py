import json
import re
from pathlib import Path

# HSK 6-9급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_data = json.loads(f.read())

# HSK 6-9급 단어 필터링
adv_words = [w for w in words_data if w.get('hskLevel') in [6, 7, 8, 9]]

# 통합 번역 딕셔너리 (Mid에서 사용한 것 + Adv용 추가)
translation_dict = {
    # 주요 다단어 표현들
    'to accompany': '동반하다',
    'keep sb company': '함께하다',
    'in charge': '담당하다',
    'person in charge': '담당자',
    'responsible for': '책임지다',
    'to complete a contract': '계약을 성립하다',
    'reach a deal': '거래하다',
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

    # 단일 단어들 (High frequency)
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
    'to cheat': '속이다',
    'to spit': '뱉다',
    'to start': '시작하다',
    'to bear': '견디다',
    'article': '물품',
    'to sign': '서명하다',
    'satellite': '위성',
    'to enjoy': '즐기다',
    'to appreciate': '감상하다',
    'to regret': '후회하다',
    'misfortune': '불행',
    'brains': '두뇌',
    'to point out': '지적하다',
    'to complain': '불평하다',
    'first of the ten heavenly stems': '갑',
    'second of the ten heavenly stems': '을',
    'prosperous': '번영하는',
    'hardworking': '근면한',
    'say': '말하다',
    'talk': '이야기하다',
    'speak': '말하다',
    'tell': '말해주다',
    'ask': '묻다',
    'answer': '대답하다',
    'reply': '답장하다',
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
    'push': '밀다',
    'pull': '당기다',
    'open': '열다',
    'close': '닫다',
    'turn': '돌리다',
    'move': '움직이다',
    'stop': '멈추다',
    'continue': '계속하다',
    'begin': '시작하다',
    'end': '끝나다',
    'finish': '완료하다',
    'start': '시작하다',
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
    'seek': '찾다',
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
        '的': '~의',
        '是': '이다',
        '不': '아니다',
        '了': '완료',
        '在': '있다',
        '有': '가지다',
        '和': '그리고',
        '人': '사람',
        '这': '이것',
        '中': '중간',
        '大': '크다',
        '为': '하다',
        '以': '이용하여',
        '个': '개',
        '地': '땅',
        '到': '도달',
        '说': '말하다',
        '生': '생기다',
        '年': '해',
        '去': '가다',
        '好': '좋다',
        '把': '잡다',
        '他': '그',
        '家': '집',
        '子': '아들',
        '女': '여자',
        '日': '날',
        '月': '달',
        '火': '불',
        '水': '물',
        '木': '나무',
        '金': '금',
        '土': '흙',
        '心': '마음',
        '口': '입',
        '手': '손',
        '足': '발',
    }

    if hanzi in hanzi_meanings:
        return f"{hanzi}({hanzi_meanings[hanzi]})"
    return f"{hanzi}(한자)"

# 파일 생성 (d01-d67, 약 100개씩)
words_per_file = 100
total_files = (len(adv_words) + words_per_file - 1) // words_per_file

print(f"Generating Adv vocabulary files: d01-d{total_files:02d}")

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

    print(f"[생성 중] {filename}: {len(file_words)}개")

print(f"\n=== 생성 완료 ({total_files}개 파일) ===")
