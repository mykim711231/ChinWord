import json
from pathlib import Path

# 200개 4자성어 완전 상세 데이터
chengyu_list = [
    # 1. 온고지신 (温故知新)
    {
        'rank': 1,
        'hanzi': '温故知新',
        'pinyin': 'Wēn gù zhī xīn',
        'meaning_ko': '옛것을 익히고 새것을 안다',
        'original': '温故而知新，可以为师矣',
        'original_pinyin': 'Wēn gù ér zhī xīn, kě yǐ wéi shī yǐ',
        'source': '『논어』 위정편(为政篇)',
        'etymology': '공자가 "옛것을 익히고 새것을 알면 스승이 될 수 있다"고 한 데서 유래. 단순 암기가 아닌, 배운 것에서 새로운 의미를 발견하는 태도를 강조.',
        'characters': [
            {'hanzi': '温', 'pinyin': 'wēn', 'radical': '따뜻할 온', 'meaning': '데우다, 다시 익히다, 따뜻하다'},
            {'hanzi': '故', 'pinyin': 'gù', 'radical': '옛 고', 'meaning': '지나간 일, 이미 배운 것, 이유'},
            {'hanzi': '知', 'pinyin': 'zhī', 'radical': '알 지', 'meaning': '알다, 깨닫다, 이해하다'},
            {'hanzi': '新', 'pinyin': 'xīn', 'radical': '새 신', 'meaning': '새롭다, 새로운 지식, 처음'},
        ],
        'synonyms': [
            {'hanzi': '学而时习', 'pinyin': 'xué ér shí xí', 'meaning': '배우고 때때로 익히다'},
            {'hanzi': '鉴往知来', 'pinyin': 'jiàn wǎng zhī lái', 'meaning': '과거를 거울삼아 미래를 알다'},
            {'hanzi': '举一反三', 'pinyin': 'jǔ yī fǎn sān', 'meaning': '하나를 들어서 셋을 미루어 알다'},
        ]
    },
    {
        'rank': 2,
        'hanzi': '卧虎藏龙',
        'pinyin': 'Wò hǔ cáng lóng',
        'meaning_ko': '숨겨진 인재가 많다',
        'original': '卧虎藏龙',
        'original_pinyin': 'Wò hǔ cáng lóng',
        'source': '중국 고대 민간 이야기',
        'etymology': '호랑이와 용이 숨어있다는 뜻으로, 표면에는 드러나지 않지만 뛰어난 인재나 능력이 감춰져 있음을 의미. 영화 "와호장룡"으로도 유명.',
        'characters': [
            {'hanzi': '卧', 'pinyin': 'wò', 'radical': '누울 와', 'meaning': '누워있다, 숨어있다, 웅크리다'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 맹수, 강함'},
            {'hanzi': '藏', 'pinyin': 'cáng', 'radical': '숨길 장', 'meaning': '숨기다, 감춘다, 은폐하다'},
            {'hanzi': '龙', 'pinyin': 'lóng', 'radical': '용 용', 'meaning': '용, 비의상징, 최고의 것'},
        ],
        'synonyms': [
            {'hanzi': '藏龙卧虎', 'pinyin': 'cáng lóng wò hǔ', 'meaning': '용과 호랑이가 숨어있다'},
            {'hanzi': '人杰地灵', 'pinyin': 'rén jié dì líng', 'meaning': '사람이 뛰어나고 땅이 영험하다'},
            {'hanzi': '深藏不露', 'pinyin': 'shēn cáng bù lù', 'meaning': '깊이 숨겨져 드러나지 않다'},
        ]
    },
    {
        'rank': 3,
        'hanzi': '画龙点睛',
        'pinyin': 'Huà lóng diǎn jīng',
        'meaning_ko': '마지막에 핵심을 더해 완성하다',
        'original': '画龙点睛',
        'original_pinyin': 'Huà lóng diǎn jīng',
        'source': '『晋书』 안도편(安都篇)',
        'etymology': '용을 그릴 때 눈을 그려 넣음으로써 완성된다는 뜻. 어떤 일이 거의 완성되었을 때 마지막으로 중요한 것을 더함으로써 비로소 완벽해짐을 의미.',
        'characters': [
            {'hanzi': '画', 'pinyin': 'huà', 'radical': '그릴 화', 'meaning': '그리다, 그림, 도형'},
            {'hanzi': '龙', 'pinyin': 'lóng', 'radical': '용 용', 'meaning': '용, 비의상징, 최고의 것'},
            {'hanzi': '点', 'pinyin': 'diǎn', 'radical': '찍을 점', 'meaning': '점, 찍다, 표시'},
            {'hanzi': '睛', 'pinyin': 'jīng', 'radical': '눈동자 정', 'meaning': '눈, 시력, 명확함'},
        ],
        'synonyms': [
            {'hanzi': '锦上添花', 'pinyin': 'jǐn shàng tiān huā', 'meaning': '비단 위에 꽃을 더하다'},
            {'hanzi': '妙笔生花', 'pinyin': 'miào bǐ shēng huā', 'meaning': '묘한 붓으로 꽃을 피우다'},
            {'hanzi': '完美无缺', 'pinyin': 'wán měi wú quē', 'meaning': '완벽하고 부족함이 없다'},
        ]
    },
    # 추가 성어들 (197개 더 필요)
]

# 추가로 필요한 성어들을 더 효율적으로 생성
# 기본 구조를 유지하면서 데이터를 보강
additional_chengyu = [
    ('龙飞凤舞', 'Lóng fēi fèng wǔ', '기세있고 우아하다', '용이 날고 봉황이 춘다는 뜻으로 기세있고 우아한 모습을 표현.', '『毛诗·卷阿』'),
    ('龙潭虎穴', 'Lóng tán hǔ xuè', '위험한 곳', '용의 못과 호랑이의 굴이라는 뜻으로 위험하고 무서운 곳을 의미.', '중국 고대 성어'),
    ('虎背熊腰', 'Hǔ bèi xióng yāo', '체격이 크고 강하다', '호랑이의 등과 곰의 허리를 갖추었다는 뜻으로 체격이 크고 강한 모습.', '고대 중국'),
    ('虎头蛇尾', 'Hǔ tóu shé wěi', '시작은 거창하나 끝이 좋지 못하다', '호랑이 머리에 뱀 꼬리라는 뜻으로 시작은 큰데 끝이 좋지 못함을 의미.', '『淮南子』'),
    ('狼吞虎咽', 'Láng tūn hǔ yàn', '급하게 먹다', '늑대처럼 삼키고 호랑이처럼 삼킨다는 뜻으로 급하게 먹는 모습을 표현.', '중국 고대 성어'),
    ('羊入虎口', 'Yáng rù hǔ kǒu', '위험한 곳에 들어가다', '양이 호랑이 입에 들어간다는 뜻으로 자신의 몸을 위험에 빠뜨림을 의미.', '『여씨춘추』'),
    ('为虎添翼', 'Wéi hǔ tiān yì', '악을 도와주다', '호랑이에게 날개를 더해주다는 뜻으로 악한 자를 도와 더욱 해로움.', '『增广贤文』'),
    ('千锤百炼', 'Qiān chuí bǎi liàn', '여러 번 단련되다', '천 번 망치질하고 백 번 불에 단련한다는 뜻으로 어떤 것이 여러 번 단련됨.', '동한 시대'),
    ('百花齐放', 'Bǎi huā qí fàng', '백 가지 꽃이 모두 핀다', '다양한 문화와 예술이 발전함을 의미하는 마오쩌둥 시대 구호.', '현대 중국'),
    ('百闻不如一见', 'Bǎi wén bù rú yī jiàn', '백 번 듣는 것이 한 번 보는 것만 못하다', '직접 보는 것이 들었을 때보다 훨씬 더 정확함을 의미.', '중국 고대 속담'),
]

print(f"생성된 4자성어: {len(chengyu_list)}개")
print(f"추가 필요한 성어: {200 - len(chengyu_list)}개")
print(f"\n권장사항: 완전 상세형 200개 생성을 위해 다음 단계 진행:")
print("1. 기본 3개 성어 상세 정보 검증")
print("2. 추가 197개 성어에 대한 상세 정보 수집")
print("3. 마크다운 파일 생성 및 검증")
print("\n현재 상태: 기본 구조 정의 완료 (상세 데이터 입력 필요)")

# 마크다운 파일 생성 (기본 3개만)
output_path = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Idioms\4자성어.md")
output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    f.write("# 4자성어 (四字成語)\n\n")
    f.write("> 상황: 중국 고전에서 유래한 유명한 4자성어\n")
    f.write("> 수준: 광범위 학습 (200개)\n")
    f.write("> 단어 수: 200개 (현재 3개 샘플)\n\n")
    f.write("---\n\n")

    for idiom in chengyu_list:
        f.write(f"### {idiom['rank']}. {idiom['hanzi']} / {idiom['pinyin']} / [성어] / {idiom['meaning_ko']}\n\n")
        f.write(f"- 원문: {idiom['original']} ({idiom['original_pinyin']}) — {idiom['source']}\n")
        f.write(f"- 유래: {idiom['etymology']}\n")
        f.write(f"- 글자별 풀이:\n")
        for char in idiom['characters']:
            f.write(f"  - {char['hanzi']} ({char['pinyin']}): {char['radical']} — {char['meaning']}\n")
        f.write(f"- 유의어:\n")
        for syn in idiom['synonyms']:
            f.write(f"  - {syn['hanzi']} ({syn['pinyin']}): {syn['meaning']}\n")
        f.write(f"\n---\n\n")

print(f"\n기본 샘플 파일 생성: 4자성어.md (3개 항목)")
print(f"경로: Doc/Markdown/hsk-themes/Idioms/4자성어.md")
