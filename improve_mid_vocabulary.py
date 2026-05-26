import json
import re
from pathlib import Path

# HSK 5급 단어 로드
with open(r"D:\_Git\ChinWord\app\src\data\hsk-words.json", 'r', encoding='utf-8') as f:
    words_data = json.loads(f.read())

# HSK 5급 단어를 id로 매핑
hsk5_by_id = {w['id']: w for w in words_data if w.get('hskLevel') == 5}

# 더 정교한 영어→한국어 번역
comprehensive_translation = {
    'will': '~할 것이다, 의지',
    'nerve': '신경, 담력',
    'club': '클럽, 동호회',
    'spit': '뱉다, 뱉아내다',
    'until': '~까지',
    'only': '오직, 단지',
    'mention': '언급하다, 말하다',
    'just': '정확히, 바로',
    'ton': '톤',
    'justice': '정의, 공정',
    'candid': '솔직한, 터놓은',
    'humor': '유머, 재미',
    'logic': '논리, 논리적',
    'blog': '블로그',
    'talks': '회담, 대화',
    'adjust': '조정하다, 맞추다',
    'use': '사용하다, 쓰다',
    'regular': '정규의, 규칙적',
    'motor': '모터, 자동차',
    'chinese': '중국의, 중국어',
    'front': '앞, 전면',
    'baijiu': '백주, 중국 소주',
    'prose': '산문, 수필',
    'comic': '만화, 코미디',
    'dialogue': '대화, 대사',
    'language': '언어, 말',
    'word': '단어, 말',
    'voice': '목소리, 음성',
    'sound': '소리, 음향',
    'speak': '말하다, 이야기하다',
    'talk': '말하다, 대화하다',
    'say': '말하다',
    'tell': '말하다, 말해주다',
    'ask': '묻다, 질문하다',
    'answer': '대답하다, 응답하다',
    'reply': '대답하다, 회신하다',
    'company': '회사, 기업',
    'business': '사업, 업무',
    'work': '일하다, 작동하다',
    'job': '직업, 일',
    'staff': '직원, 스태프',
    'employee': '직원, 종업원',
    'manager': '관리자, 경영자',
    'team': '팀, 팀',
    'customer': '고객, 소비자',
    'client': '고객, 클라이언트',
    'market': '시장, 마켓',
    'trade': '거래, 무역',
    'economy': '경제',
    'finance': '금융, 재무',
    'profit': '이익, 수익',
    'loss': '손실, 손해',
    'money': '돈, 화폐',
    'salary': '급여, 봉급',
    'price': '가격, 값',
    'cost': '비용, 경비',
    'contract': '계약, 약정',
    'project': '프로젝트, 사업',
    'report': '보고, 리포트',
    'meeting': '회의, 모임',
    'service': '서비스, 봉사',
    'product': '상품, 제품',
    'society': '사회, 사회',
    'culture': '문화',
    'tradition': '전통',
    'custom': '관습, 풍습',
    'festival': '축제, 명절',
    'art': '예술, 미술',
    'history': '역사',
    'education': '교육',
    'news': '뉴스, 소식',
    'media': '미디어, 매체',
    'public': '대중, 공중',
    'citizen': '시민, 국민',
    'happy': '행복한, 즐거운',
    'sad': '슬픈, 우울한',
    'angry': '화난, 분노한',
    'afraid': '두려운, 무서운',
    'love': '사랑하다, 좋아하다',
    'hate': '싫어하다, 증오하다',
    'like': '좋아하다, 선호하다',
    'emotion': '감정, 정서',
    'feeling': '느낌, 감정',
    'mind': '마음, 정신',
    'heart': '심장, 마음',
    'nature': '자연',
    'animal': '동물, 짐승',
    'plant': '식물, 초목',
    'water': '물, 수',
    'sky': '하늘, 공중',
    'sun': '태양, 해',
    'moon': '달, 월',
    'star': '별, 항성',
    'weather': '날씨, 기후',
    'rain': '비, 강수',
    'wind': '바람, 위드',
    'tree': '나무, 수목',
    'flower': '꽃, 화',
    'science': '과학, 학문',
    'think': '생각하다, 사고하다',
    'understand': '이해하다, 알다',
    'reason': '이유, 근거',
    'logic': '논리, 논리적',
    'true': '참, 진짜',
    'false': '거짓, 거짓',
    'right': '맞은, 올바른',
    'wrong': '틀린, 잘못',
    'possible': '가능한',
    'impossible': '불가능한',
    'necessary': '필요한',
    'important': '중요한',
}

# 부수 정보 개선 (간체 글자 → 繁体/부수명)
radical_improvements = {
    '将': '목재+장수',
    '声': '음성부수',
    '俱': '사람+모두',
    '乐': '음악+즐거움',
    '部': '부서+부분',
    '吐': '입+토해내다',
    '为': '위+~하기 위해',
    '止': '멈추다',
    '只': '오직+하나',
    '不': '아니다',
    '过': '지나다+넘다',
    '答': '대답+응답',
    '句': '문장+구',
    '话': '말+이야기',
    '提': '끌어올리다',
    '起': '일어나다+시작',
    '公': '공공+공',
    '正': '올바른+정확',
    '吨': '톤+무게',
    '义': '의리+정의',
    '干': '방패간+뭔가',
    '脆': '약한+쉽게 부러지는',
    '决': '결정하다',
    '幽': '고요한+신비로운',
    '默': '침묵하다',
    '逻': '길+논리',
    '辑': '수집하다',
    '博': '넓다+박식',
    '会': '모임+회',
    '谈': '말하다+담',
    '调': '조절하다',
    '节': '마디+절',
    '华': '꽃+영화',
    '跟': '따라다니다',
    '白': '흰색+흰',
    '酒': '술+술잔',
    '散': '흩어지다+산문',
    '相': '모습+서로',
}

def improved_translation(english_text):
    """개선된 영어→한국어 번역"""
    if not english_text:
        return "뜻 정보 없음"

    # 첫 번째 의미만 추출
    first_part = english_text.split(';')[0].strip()
    first_part = re.sub(r'\([^)]*\)', '', first_part).strip()

    words = first_part.lower().split()

    for word in words:
        word_clean = word.rstrip('.,:;')
        if word_clean in comprehensive_translation:
            return comprehensive_translation[word_clean]

    # 매칭 안 되면 원문 첫 부분 반환
    return first_part[:40]

# Mid 폴더의 모든 파일 처리
mid_folder = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Mid")
for md_file in sorted(mid_folder.glob("t*.md")):
    print(f"\n[개선 중] {md_file.name}")

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
            improved_lines.append(line)
            i += 1

            # 한 줄 띄기
            if i < len(lines) and lines[i] == '':
                improved_lines.append(lines[i])
                i += 1

            # 한자 풀이 섹션 찾기
            if i < len(lines) and lines[i].startswith('- 한자 풀이:'):
                improved_lines.append(lines[i])
                i += 1

                # 한자 풀이 라인들 처리
                while i < len(lines) and lines[i].startswith('  - '):
                    hanzi_line = lines[i]
                    # ID 주석까지 읽기
                    i += 1
                    if i < len(lines) and lines[i] == '':
                        i += 1

                    # 현재 라인에서 한자 추출
                    match = re.search(r'  - (.+?): (.+?) → (.+)', hanzi_line)
                    if match:
                        hanzi = match.group(1)
                        radical = match.group(2)
                        meaning = match.group(3)

                        # 의미 개선
                        improved_meaning = improved_translation(meaning) if '부수불명' not in radical else meaning

                        # 부수 개선
                        improved_radical = radical_improvements.get(hanzi.split('+')[0], radical) if '+' not in radical else radical

                        improved_lines.append(f"  - {hanzi}: {improved_radical} → {improved_meaning}")
                    else:
                        improved_lines.append(hanzi_line)
        else:
            improved_lines.append(line)
            i += 1

    # 개선된 내용 저장
    improved_content = '\n'.join(improved_lines)

    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(improved_content)

    print(f"  [OK] {md_file.name} 개선 완료")

print("\n=== 모든 파일 개선 완료 ===")
