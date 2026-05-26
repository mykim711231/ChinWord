from pathlib import Path
import re

# 200개 성어 - 글자별 풀이와 유의어 상세 데이터
chengyu_full_details = {
    '温故知新': {
        'chars': [('温', 'wēn', '따뜻할 온', '데우다, 복습하다'), ('故', 'gù', '옛 고', '지나간 일'), ('知', 'zhī', '알 지', '깨닫다'), ('新', 'xīn', '새 신', '새로운 것')],
        'syns': [('学而时习', 'xué ér shí xí', '배우고 때때로 익히다'), ('鉴往知来', 'jiàn wǎng zhī lái', '과거를 거울삼아 미래를 알다')]
    },
    '卧虎藏龙': {
        'chars': [('卧', 'wò', '누울 와', '숨어있다'), ('虎', 'hǔ', '호랑이 호', '맹수'), ('藏', 'cáng', '숨길 장', '감춘다'), ('龙', 'lóng', '용 용', '최고의 것')],
        'syns': [('藏龙卧虎', 'cáng lóng wò hǔ', '용과 호랑이가 숨어있다'), ('人杰地灵', 'rén jié dì líng', '사람이 뛰어나다')]
    },
    '画龙点睛': {
        'chars': [('画', 'huà', '그릴 화', '그리다'), ('龙', 'lóng', '용 용', '최고의 것'), ('点', 'diǎn', '찍을 점', '표시'), ('睛', 'jīng', '눈동자 정', '눈')],
        'syns': [('锦上添花', 'jǐn shàng tiān huā', '비단 위에 꽃을 더하다'), ('妙笔生花', 'miào bǐ shēng huā', '묘한 붓으로 꽃을 피우다')]
    },
    '龙飞凤舞': {
        'chars': [('龙', 'lóng', '용 용', '최고의 것'), ('飞', 'fēi', '날 비', '날다'), ('凤', 'fèng', '봉황 봉', '상서로운 새'), ('舞', 'wǔ', '춤 무', '춤을 춘다')],
        'syns': [('笔走龙蛇', 'bǐ zǒu lóng shé', '붓이 용처럼 움직인다'), ('生龙活虎', 'shēng lóng huó hǔ', '생동하는 용과 호랑이')]
    },
    '龙潭虎穴': {
        'chars': [('龙', 'lóng', '용 용', '신비로움'), ('潭', 'tán', '못 담', '물이 고인 곳'), ('虎', 'hǔ', '호랑이 호', '맹수'), ('穴', 'xuè', '굴 혈', '굴')],
        'syns': [('虎狼之地', 'hǔ láng zhī dì', '호랑이 늑대 같은 곳'), ('凶险万分', 'xiōng xiǎn wàn fēn', '몹시 위험하다')]
    },
    '虎背熊腰': {
        'chars': [('虎', 'hǔ', '호랑이 호', '강함'), ('背', 'bèi', '등 배', '뒤'), ('熊', 'xióng', '곰 웅', '큼'), ('腰', 'yāo', '허리 요', '중심')],
        'syns': [('膀大腰圆', 'páng dà yāo yuán', '팔뚝이 크고 둥글다'), ('体格魁梧', 'tǐ gé kuí wǔ', '체격이 크다')]
    },
    '虎头蛇尾': {
        'chars': [('虎', 'hǔ', '호랑이 호', '거대함'), ('头', 'tóu', '머리 두', '시작'), ('蛇', 'shé', '뱀 사', '작음'), ('尾', 'wěi', '꼬리 미', '끝')],
        'syns': [('始终不一', 'shǐ zhōng búyī', '처음과 끝이 다르다'), ('虎头鼠尾', 'hǔ tóu shǔ wěi', '호랑이 머리에 쥐 꼬리')]
    },
    '狼吞虎咽': {
        'chars': [('狼', 'láng', '늑대 랑', '급함'), ('吞', 'tūn', '삼킬 탄', '삼키다'), ('虎', 'hǔ', '호랑이 호', '강함'), ('咽', 'yàn', '삼킬 인', '목구멍')],
        'syns': [('风卷残云', 'fēng juǎn cán yún', '바람이 구름을 날린다'), ('暴饮暴食', 'bào yǐn bào shí', '폭식한다')]
    },
    '羊入虎口': {
        'chars': [('羊', 'yáng', '양 양', '약함'), ('入', 'rù', '들 입', '들어가다'), ('虎', 'hǔ', '호랑이 호', '위험'), ('口', 'kǒu', '입 구', '함정')],
        'syns': [('羊落狼口', 'yáng luò láng kǒu', '양이 늑대 입에 떨어지다'), ('自投罗网', 'zì tóu luó wǎng', '자신이 그물에 들어가다')]
    },
    '为虎添翼': {
        'chars': [('为', 'wéi', '할 위', '돕다'), ('虎', 'hǔ', '호랑이 호', '악'), ('添', 'tiān', '더할 첨', '더하다'), ('翼', 'yì', '날개 익', '힘')],
        'syns': [('如虎添翼', 'rú hǔ tiān yì', '호랑이가 날개를 얻다'), ('助纣为虐', 'zhù zhòu wéi nüè', '악을 돕다')]
    },
}

def enhance_idiom_files():
    """기존 파일의 [상세 정보는 개선 중] 부분을 실제 정보로 대체"""
    output_dir = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Idioms")

    # i01_Top.md와 i02_Top.md 처리
    for filename in ['i01_Top.md', 'i02_Top.md']:
        filepath = output_dir / filename

        if not filepath.exists():
            print(f"파일이 없습니다: {filename}")
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # 처음 10개 성어에 대해 상세 정보 추가
        for hanzi, details in list(chengyu_full_details.items())[:10]:
            # 기존 패턴 찾아서 업데이트
            pattern = f"(### \\d+\\. {re.escape(hanzi)} /[^\\n]*\\n\\n[^-]*?)(- 글자별 풀이: \\[상세 정보는 개선 중\\]\\n)(- 유의어: \\[상세 정보는 개선 중\\])"

            replacement = f"\\1"
            replacement += "- 글자별 풀이:\n"
            for char, pinyin, radical, meaning in details['chars']:
                replacement += f"  - {char} ({pinyin}): {radical} — {meaning}\n"
            replacement += "- 유의어:\n"
            for syn_hanzi, syn_pinyin, syn_meaning in details['syns']:
                replacement += f"  - {syn_hanzi} ({syn_pinyin}): {syn_meaning}"

            # 더 간단한 방식으로 시도
            old_pattern = f"### {hanzi.split()[0]}" if ' ' in hanzi else f"### 1. {hanzi}"

        # 직접 파일 재작성 - 정규식 대신 라인별 처리
        lines = content.split('\n')
        new_lines = []
        i = 0

        while i < len(lines):
            line = lines[i]
            new_lines.append(line)

            # 글자별 풀이 섹션 찾기
            if '- 글자별 풀이: [상세 정보는 개선 중]' in line:
                # 현재 성어의 한자 추출 (앞의 ### 라인에서)
                for j in range(len(new_lines) - 1, -1, -1):
                    if new_lines[j].startswith('###'):
                        # 한자 추출
                        hanzi_match = re.search(r'### \d+\. (\S+) /', new_lines[j])
                        if hanzi_match:
                            hanzi = hanzi_match.group(1)
                            if hanzi in chengyu_full_details:
                                details = chengyu_full_details[hanzi]
                                # [상세 정보는 개선 중] 제거
                                new_lines[-1] = '- 글자별 풀이:'
                                # 글자별 풀이 추가
                                for char, pinyin, radical, meaning in details['chars']:
                                    new_lines.append(f"  - {char} ({pinyin}): {radical} — {meaning}")
                        break

            # 유의어 섹션 찾기
            if '- 유의어: [상세 정보는 개선 중]' in line:
                # 현재 성어 찾기
                for j in range(len(new_lines) - 1, -1, -1):
                    if new_lines[j].startswith('###'):
                        hanzi_match = re.search(r'### \d+\. (\S+) /', new_lines[j])
                        if hanzi_match:
                            hanzi = hanzi_match.group(1)
                            if hanzi in chengyu_full_details:
                                details = chengyu_full_details[hanzi]
                                # [상세 정보는 개선 중] 제거
                                new_lines[-1] = '- 유의어:'
                                # 유의어 추가
                                for syn_hanzi, syn_pinyin, syn_meaning in details['syns']:
                                    new_lines.append(f"  - {syn_hanzi} ({syn_pinyin}): {syn_meaning}")
                        break

            i += 1

        # 파일 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))

        print(f"- {filename} 상세 정보 추가 완료 (처음 10개 성어)")

print("상세 정보 추가 작업을 시작합니다...")
print("현재 처음 10개 성어(1-10번)에 대한 글자별 풀이와 유의어를 추가합니다.")
print("\n나머지 190개(11-200번) 성어는 다음 단계에서 추가될 예정입니다.")
print("\n추가될 정보:")
print("- 글자별 풀이: 4개 글자 각각의 음/한국어 의미/상세 설명")
print("- 유의어: 2-3개의 관련 성어와 그 의미")
