import re
from pathlib import Path

trans = {
    'matrimony': '결혼', 'wedding': '결혼', 'marriage': '결혼',
    'period': '시기', 'phase': '시대', 'theatrical': '극극작',
    'work': '작품', 'opera': '오페라', 'play': '연극',
    'ruthless': '냉정한', 'strong': '강한', 'organism': '생물',
    'creature': '생명체', 'life form': '생명체', 'biological': '생물학적',
    'variant': '변형', 'interjection': '감탄사', 'and': '그리고',
    'moreover': '더욱이', 'serbia': '세르비아', 'classifier': '분류사',
    'surname': '성', 'abbr': '약자', 'to provide': '제공하다',
    'to recommend': '추천하다', 'to attack': '공격하다',
    'to kick': '차다', 'to dig': '파다', 'to carry': '운반하다',
    'to set': '설정하다', 'to watch': '보다', 'to chat': '수다떨다',
    'policy': '정책', 'court': '법원', 'alliance': '동맹',
    'mother': '어머니', 'ceremony': '의식', 'to say': '말하다',
    'to remove': '제거하다', 'god': '신', 'wolf': '늑대',
    'player': '선수', 'or': '또는', 'domain': '영역',
    'field': '분야', 'to reveal': '드러내다', 'corpse': '시체',
    'side': '옆', 'team': '팀', 'to close': '닫다',
    'unusual': '이상한', 'powder': '가루', 'file': '파일',
    'record': '기록', 'to sigh': '한숨쉬다', 'association': '협회',
    'public': '공공의', 'cell': '세포', 'support': '지탱',
    'symptom': '증상', 'patient': '환자', 'military': '군사',
    'pole': '극', 'bean': '콩', 'soul': '영혼',
    'spirit': '정신', 'to suffer': '고생하다', 'to cut': '끊다',
    'extinct': '멸종된', 'material': '재료', 'to release': '해방하다',
    'to win': '이기다', 'heart': '심장', 'struggle': '투쟁',
    'family': '가족'
}

def clean(text):
    text = text.strip()
    if not text:
        return '(의미 대기)'

    # 영문만 있는지 확인 (한글이 거의 없으면)
    korean_count = sum(1 for c in text if ord('가') <= ord(c) <= ord('힣'))
    has_english = bool(re.search(r'[a-zA-Z]', text))

    # 한글이 충분하면 그냥 반환
    if korean_count >= 5 and has_english:
        return text

    # 영문이 많으면 번역 시도
    text_lower = text.lower()
    for k, v in sorted(trans.items(), key=lambda x: -len(x[0])):
        if k in text_lower:
            return v

    # 첫 부분 추출
    m = re.match(r'([^;,\(]*)', text)
    result = m.group(1).strip() if m else ''
    return result[:40] if len(result) > 0 else '(의미 대기)'

def process(fp):
    with open(fp, encoding='utf-8') as f:
        content = f.read()

    def replace_func(m):
        prefix = m.group(1)
        meaning = m.group(2)
        cleaned = clean(meaning)
        return prefix + cleaned

    content = re.sub(
        r'(###\s+\d+\.\s+[^\s/]+\s*/\s+[^\s/]+\s*/\s+\[[^\]]+\]\s*/\s+)([^\n]+)',
        replace_func,
        content
    )

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)

for i in range(2, 68):
    fp = Path(f"Doc/Markdown/hsk-themes/Adv/d{i:02d}_Top.md")
    if fp.exists():
        process(fp)

print("완료!")
