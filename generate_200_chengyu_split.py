import json
from pathlib import Path

# 200개 4자성어 완전 상세 데이터 (50개씩 4개 파일로 분리)
chengyu_list = [
    # 1-10: 기본 성어
    {
        'rank': 1,
        'hanzi': '温故知新',
        'pinyin': 'Wēn gù zhī xīn',
        'meaning_ko': '옛것을 익히고 새것을 안다',
        'source': '『논어』 위정편',
        'etymology': '공자가 "옛것을 익히고 새것을 알면 스승이 될 수 있다"고 한 데서 유래. 단순 암기가 아닌, 배운 것에서 새로운 의미를 발견하는 태도를 강조.',
        'characters': [
            {'hanzi': '温', 'pinyin': 'wēn', 'radical': '따뜻할 온', 'meaning': '데우다, 다시 익히다'},
            {'hanzi': '故', 'pinyin': 'gù', 'radical': '옛 고', 'meaning': '지나간 일, 이미 배운 것'},
            {'hanzi': '知', 'pinyin': 'zhī', 'radical': '알 지', 'meaning': '알다, 깨닫다'},
            {'hanzi': '新', 'pinyin': 'xīn', 'radical': '새 신', 'meaning': '새롭다, 새로운 지식'},
        ],
        'synonyms': [
            {'hanzi': '学而时习', 'pinyin': 'xué ér shí xí', 'meaning': '배우고 때때로 익히다'},
            {'hanzi': '鉴往知来', 'pinyin': 'jiàn wǎng zhī lái', 'meaning': '과거를 거울삼아 미래를 알다'},
        ]
    },
    {
        'rank': 2,
        'hanzi': '卧虎藏龙',
        'pinyin': 'Wò hǔ cáng lóng',
        'meaning_ko': '숨겨진 인재가 많다',
        'source': '중국 고대 민간 이야기',
        'etymology': '호랑이와 용이 숨어있다는 뜻으로, 표면에는 드러나지 않지만 뛰어난 인재나 능력이 감춰져 있음을 의미.',
        'characters': [
            {'hanzi': '卧', 'pinyin': 'wò', 'radical': '누울 와', 'meaning': '누워있다, 숨어있다'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 맹수'},
            {'hanzi': '藏', 'pinyin': 'cáng', 'radical': '숨길 장', 'meaning': '숨기다, 감춘다'},
            {'hanzi': '龙', 'pinyin': 'lóng', 'radical': '용 용', 'meaning': '용, 최고의 것'},
        ],
        'synonyms': [
            {'hanzi': '藏龙卧虎', 'pinyin': 'cáng lóng wò hǔ', 'meaning': '용과 호랑이가 숨어있다'},
            {'hanzi': '人杰地灵', 'pinyin': 'rén jié dì líng', 'meaning': '사람이 뛰어나고 땅이 영험하다'},
        ]
    },
    {
        'rank': 3,
        'hanzi': '画龙点睛',
        'pinyin': 'Huà lóng diǎn jīng',
        'meaning_ko': '마지막에 핵심을 더해 완성하다',
        'source': '『진서』 안도편',
        'etymology': '용을 그릴 때 눈을 그려 넣음으로써 완성된다는 뜻. 어떤 일이 거의 완성되었을 때 마지막으로 중요한 것을 더함으로써 완벽해짐을 의미.',
        'characters': [
            {'hanzi': '画', 'pinyin': 'huà', 'radical': '그릴 화', 'meaning': '그리다, 그림'},
            {'hanzi': '龙', 'pinyin': 'lóng', 'radical': '용 용', 'meaning': '용, 최고의 것'},
            {'hanzi': '点', 'pinyin': 'diǎn', 'radical': '찍을 점', 'meaning': '점, 찍다'},
            {'hanzi': '睛', 'pinyin': 'jīng', 'radical': '눈동자 정', 'meaning': '눈'},
        ],
        'synonyms': [
            {'hanzi': '锦上添花', 'pinyin': 'jǐn shàng tiān huā', 'meaning': '비단 위에 꽃을 더하다'},
            {'hanzi': '妙笔生花', 'pinyin': 'miào bǐ shēng huā', 'meaning': '묘한 붓으로 꽃을 피우다'},
        ]
    },
    {
        'rank': 4,
        'hanzi': '龙飞凤舞',
        'pinyin': 'Lóng fēi fèng wǔ',
        'meaning_ko': '기세있고 우아하다',
        'source': '중국 고대 성어',
        'etymology': '용이 날고 봉황이 춘다는 뜻으로 기세있고 우아한 모습을 표현. 필체가 뛰어남을 비유하기도 함.',
        'characters': [
            {'hanzi': '龙', 'pinyin': 'lóng', 'radical': '용 용', 'meaning': '용, 최고의 것'},
            {'hanzi': '飞', 'pinyin': 'fēi', 'radical': '날 비', 'meaning': '날아다니다'},
            {'hanzi': '凤', 'pinyin': 'fèng', 'radical': '봉황 봉', 'meaning': '봉황, 상서로운 새'},
            {'hanzi': '舞', 'pinyin': 'wǔ', 'radical': '춤 무', 'meaning': '춤을 춘다'},
        ],
        'synonyms': [
            {'hanzi': '龙蛇飞舞', 'pinyin': 'lóng shé fēi wǔ', 'meaning': '용과 뱀처럼 춤을 춘다'},
            {'hanzi': '笔走龙蛇', 'pinyin': 'bǐ zǒu lóng shé', 'meaning': '붓이 용과 뱀처럼 움직인다'},
        ]
    },
    {
        'rank': 5,
        'hanzi': '龙潭虎穴',
        'pinyin': 'Lóng tán hǔ xuè',
        'meaning_ko': '위험한 곳',
        'source': '중국 고대 성어',
        'etymology': '용의 못과 호랑이의 굴이라는 뜻으로 위험하고 무서운 곳을 의미.',
        'characters': [
            {'hanzi': '龙', 'pinyin': 'lóng', 'radical': '용 용', 'meaning': '용'},
            {'hanzi': '潭', 'pinyin': 'tán', 'radical': '못 담', 'meaning': '물이 고인 곳'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이'},
            {'hanzi': '穴', 'pinyin': 'xuè', 'radical': '굴 혈', 'meaning': '굴, 집'},
        ],
        'synonyms': [
            {'hanzi': '虎狼之地', 'pinyin': 'hǔ láng zhī dì', 'meaning': '호랑이 늑대 같은 곳'},
            {'hanzi': '凶险万分', 'pinyin': 'xiōng xiǎn wàn fēn', 'meaning': '몹시 위험하다'},
        ]
    },
    {
        'rank': 6,
        'hanzi': '虎背熊腰',
        'pinyin': 'Hǔ bèi xióng yāo',
        'meaning_ko': '체격이 크고 강하다',
        'source': '중국 고대 성어',
        'etymology': '호랑이의 등과 곰의 허리를 갖추었다는 뜻으로 체격이 크고 강한 모습을 표현.',
        'characters': [
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 강함'},
            {'hanzi': '背', 'pinyin': 'bèi', 'radical': '등 배', 'meaning': '등, 뒤'},
            {'hanzi': '熊', 'pinyin': 'xióng', 'radical': '곰 웅', 'meaning': '곰, 큼'},
            {'hanzi': '腰', 'pinyin': 'yāo', 'radical': '허리 요', 'meaning': '허리'},
        ],
        'synonyms': [
            {'hanzi': '五大三粗', 'pinyin': 'wǔ dà sān cū', 'meaning': '크고 우악스럽다'},
            {'hanzi': '膀大腰圆', 'pinyin': 'páng dà yāo yuán', 'meaning': '몸이 크고 둥글다'},
        ]
    },
    {
        'rank': 7,
        'hanzi': '虎头蛇尾',
        'pinyin': 'Hǔ tóu shé wěi',
        'meaning_ko': '시작은 거창하나 끝이 좋지 못하다',
        'source': '『회남자』',
        'etymology': '호랑이 머리에 뱀 꼬리라는 뜻으로 시작은 큰데 끝이 좋지 못함을 의미.',
        'characters': [
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 거대함'},
            {'hanzi': '头', 'pinyin': 'tóu', 'radical': '머리 두', 'meaning': '머리, 시작'},
            {'hanzi': '蛇', 'pinyin': 'shé', 'radical': '뱀 사', 'meaning': '뱀, 작음'},
            {'hanzi': '尾', 'pinyin': 'wěi', 'radical': '꼬리 미', 'meaning': '꼬리, 끝'},
        ],
        'synonyms': [
            {'hanzi': '始终不一', 'pinyin': 'shǐ zhōng bù yī', 'meaning': '처음과 끝이 다르다'},
            {'hanzi': '虎头鼠尾', 'pinyin': 'hǔ tóu shǔ wěi', 'meaning': '호랑이 머리에 쥐 꼬리'},
        ]
    },
    {
        'rank': 8,
        'hanzi': '狼吞虎咽',
        'pinyin': 'Láng tūn hǔ yàn',
        'meaning_ko': '급하게 먹다',
        'source': '중국 고대 성어',
        'etymology': '늑대처럼 삼키고 호랑이처럼 삼킨다는 뜻으로 급하게 먹는 모습을 표현.',
        'characters': [
            {'hanzi': '狼', 'pinyin': 'láng', 'radical': '늑대 랑', 'meaning': '늑대, 급함'},
            {'hanzi': '吞', 'pinyin': 'tūn', 'radical': '삼킬 탄', 'meaning': '삼키다'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 강함'},
            {'hanzi': '咽', 'pinyin': 'yàn', 'radical': '목구멍 연', 'meaning': '삼키다'},
        ],
        'synonyms': [
            {'hanzi': '风卷残云', 'pinyin': 'fēng juǎn cán yún', 'meaning': '바람에 구름이 흩어진다'},
            {'hanzi': '暴饮暴食', 'pinyin': 'bào yǐn bào shí', 'meaning': '폭식한다'},
        ]
    },
    {
        'rank': 9,
        'hanzi': '羊入虎口',
        'pinyin': 'Yáng rù hǔ kǒu',
        'meaning_ko': '위험한 곳에 들어가다',
        'source': '『여씨춘추』',
        'etymology': '양이 호랑이 입에 들어간다는 뜻으로 자신의 몸을 위험에 빠뜨림을 의미.',
        'characters': [
            {'hanzi': '羊', 'pinyin': 'yáng', 'radical': '양 양', 'meaning': '양, 약함'},
            {'hanzi': '入', 'pinyin': 'rù', 'radical': '들 입', 'meaning': '들어가다'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 위험'},
            {'hanzi': '口', 'pinyin': 'kǒu', 'radical': '입 구', 'meaning': '입, 함정'},
        ],
        'synonyms': [
            {'hanzi': '羊落狼口', 'pinyin': 'yáng luò láng kǒu', 'meaning': '양이 늑대 입에 떨어지다'},
            {'hanzi': '自投罗网', 'pinyin': 'zì tóu luó wǎng', 'meaning': '자신이 그물에 들어가다'},
        ]
    },
    {
        'rank': 10,
        'hanzi': '为虎添翼',
        'pinyin': 'Wéi hǔ tiān yì',
        'meaning_ko': '악을 도와주다',
        'source': '『증광현문』',
        'etymology': '호랑이에게 날개를 더해주다는 뜻으로 악한 자를 도와 더욱 해로움을 의미.',
        'characters': [
            {'hanzi': '为', 'pinyin': 'wéi', 'radical': '할 위', 'meaning': '돕다, 만들다'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이, 악'},
            {'hanzi': '添', 'pinyin': 'tiān', 'radical': '더할 첨', 'meaning': '더하다'},
            {'hanzi': '翼', 'pinyin': 'yì', 'radical': '날개 익', 'meaning': '날개, 힘'},
        ],
        'synonyms': [
            {'hanzi': '如虎添翼', 'pinyin': 'rú hǔ tiān yì', 'meaning': '호랑이가 날개를 얻다'},
            {'hanzi': '助纣为虐', 'pinyin': 'zhù zhòu wéi nüè', 'meaning': '악을 돕다'},
        ]
    },
    # 11-20
    {
        'rank': 11,
        'hanzi': '千锤百炼',
        'pinyin': 'Qiān chuí bǎi liàn',
        'meaning_ko': '여러 번 단련되다',
        'source': '동한 시대',
        'etymology': '천 번 망치질하고 백 번 불에 단련한다는 뜻으로 어떤 것이 여러 번 단련됨을 의미.',
        'characters': [
            {'hanzi': '千', 'pinyin': 'qiān', 'radical': '천 천', 'meaning': '천, 많음'},
            {'hanzi': '锤', 'pinyin': 'chuí', 'radical': '망치 추', 'meaning': '망치질'},
            {'hanzi': '百', 'pinyin': 'bǎi', 'radical': '백 백', 'meaning': '백, 많음'},
            {'hanzi': '炼', 'pinyin': 'liàn', 'radical': '불 렬', 'meaning': '단련하다'},
        ],
        'synonyms': [
            {'hanzi': '百炼成钢', 'pinyin': 'bǎi liàn chéng gāng', 'meaning': '백 번 단련해 강철이 되다'},
            {'hanzi': '卧虎藏龙', 'pinyin': 'wò hǔ cáng lóng', 'meaning': '숨겨진 능력'},
        ]
    },
    {
        'rank': 12,
        'hanzi': '百花齐放',
        'pinyin': 'Bǎi huā qí fàng',
        'meaning_ko': '다양한 문화와 예술이 발전한다',
        'source': '현대 중국',
        'etymology': '백 가지 꽃이 모두 핀다는 뜻으로 다양한 문화와 예술이 발전함을 의미.',
        'characters': [
            {'hanzi': '百', 'pinyin': 'bǎi', 'radical': '백 백', 'meaning': '백, 많음'},
            {'hanzi': '花', 'pinyin': 'huā', 'radical': '꽃 화', 'meaning': '꽃'},
            {'hanzi': '齐', 'pinyin': 'qí', 'radical': '고를 제', 'meaning': '모두, 함께'},
            {'hanzi': '放', 'pinyin': 'fàng', 'radical': '놓을 방', 'meaning': '핀다, 피다'},
        ],
        'synonyms': [
            {'hanzi': '百家争鸣', 'pinyin': 'bǎi jiā zhēng míng', 'meaning': '백 가지 사상이 경쟁한다'},
            {'hanzi': '各展风采', 'pinyin': 'gè zhǎn fēng cǎi', 'meaning': '각자 풍채를 드러내다'},
        ]
    },
    {
        'rank': 13,
        'hanzi': '百闻不如一见',
        'pinyin': 'Bǎi wén bù rú yī jiàn',
        'meaning_ko': '백 번 듣는 것이 한 번 보는 것만 못하다',
        'source': '중국 고대 속담',
        'etymology': '직접 보는 것이 들었을 때보다 훨씬 더 정확함을 의미.',
        'characters': [
            {'hanzi': '百', 'pinyin': 'bǎi', 'radical': '백 백', 'meaning': '백, 많음'},
            {'hanzi': '闻', 'pinyin': 'wén', 'radical': '들을 문', 'meaning': '듣다'},
            {'hanzi': '不', 'pinyin': 'bù', 'radical': '아닐 불', 'meaning': '아니다'},
            {'hanzi': '见', 'pinyin': 'jiàn', 'radical': '볼 견', 'meaning': '보다'},
        ],
        'synonyms': [
            {'hanzi': '眼见为实', 'pinyin': 'yǎn jiàn wéi shí', 'meaning': '눈으로 본 것이 사실이다'},
            {'hanzi': '实践出真知', 'pinyin': 'shí jiàn chū zhēn zhī', 'meaning': '실천에서 진정한 지식이 나온다'},
        ]
    },
    {
        'rank': 14,
        'hanzi': '百年树人',
        'pinyin': 'Bǎi nián shù rén',
        'meaning_ko': '백 년에 걸쳐 인재를 양성한다',
        'source': '중국 교육 격언',
        'etymology': '교육이 중요하고 시간이 걸린다는 뜻으로 인재 양성의 중요성을 강조.',
        'characters': [
            {'hanzi': '百', 'pinyin': 'bǎi', 'radical': '백 백', 'meaning': '백, 오래'},
            {'hanzi': '年', 'pinyin': 'nián', 'radical': '해 년', 'meaning': '년, 오랜 시간'},
            {'hanzi': '树', 'pinyin': 'shù', 'radical': '나무 수', 'meaning': '심다, 양성하다'},
            {'hanzi': '人', 'pinyin': 'rén', 'radical': '사람 인', 'meaning': '사람'},
        ],
        'synonyms': [
            {'hanzi': '十年树木', 'pinyin': 'shí nián shù mù', 'meaning': '십 년에 나무를 기른다'},
            {'hanzi': '教育为本', 'pinyin': 'jiào yù wéi běn', 'meaning': '교육이 근본이다'},
        ]
    },
    {
        'rank': 15,
        'hanzi': '千里之行始于足下',
        'pinyin': 'Qiān lǐ zhī xíng shǐ yú zú xià',
        'meaning_ko': '천 리의 여행은 한 발 아래서 시작된다',
        'source': '『노자』',
        'etymology': '큰 일도 작은 것에서 시작됨을 의미.',
        'characters': [
            {'hanzi': '千', 'pinyin': 'qiān', 'radical': '천 천', 'meaning': '천, 멀다'},
            {'hanzi': '里', 'pinyin': 'lǐ', 'radical': '마을 리', 'meaning': '리, 거리'},
            {'hanzi': '足', 'pinyin': 'zú', 'radical': '발 족', 'meaning': '발'},
            {'hanzi': '下', 'pinyin': 'xià', 'radical': '아래 하', 'meaning': '아래, 시작'},
        ],
        'synonyms': [
            {'hanzi': '积小成大', 'pinyin': 'jī xiǎo chéng dà', 'meaning': '작은 것이 모여 큰 것이 된다'},
            {'hanzi': '万事开头难', 'pinyin': 'wàn shì kāi tóu nán', 'meaning': '모든 일의 시작은 어렵다'},
        ]
    },
    {
        'rank': 16,
        'hanzi': '千差万别',
        'pinyin': 'Qiān chā wàn bié',
        'meaning_ko': '천차만별이다',
        'source': '중국 고대 성어',
        'etymology': '천 가지, 만 가지로 차이나고 다르다는 뜻으로 매우 많은 차이와 다양성을 의미.',
        'characters': [
            {'hanzi': '千', 'pinyin': 'qiān', 'radical': '천 천', 'meaning': '천, 많음'},
            {'hanzi': '差', 'pinyin': 'chā', 'radical': '다를 차', 'meaning': '다르다'},
            {'hanzi': '万', 'pinyin': 'wàn', 'radical': '만 만', 'meaning': '만, 매우'},
            {'hanzi': '别', 'pinyin': 'bié', 'radical': '다를 별', 'meaning': '다르다, 구분'},
        ],
        'synonyms': [
            {'hanzi': '千般不同', 'pinyin': 'qiān bān bù tóng', 'meaning': '천 가지로 다르다'},
            {'hanzi': '五花八门', 'pinyin': 'wǔ huā bā mén', 'meaning': '다양하고 많다'},
        ]
    },
    {
        'rank': 17,
        'hanzi': '万古长青',
        'pinyin': 'Wàn gǔ cháng qīng',
        'meaning_ko': '영원히 푸르다',
        'source': '중국 고대 성어',
        'etymology': '만 년이 지나도 항상 푸르다는 뜻으로 영원히 변하지 않는 모습을 의미.',
        'characters': [
            {'hanzi': '万', 'pinyin': 'wàn', 'radical': '만 만', 'meaning': '만, 영원'},
            {'hanzi': '古', 'pinyin': 'gǔ', 'radical': '옛 고', 'meaning': '옛날'},
            {'hanzi': '长', 'pinyin': 'cháng', 'radical': '길 장', 'meaning': '길다, 항상'},
            {'hanzi': '青', 'pinyin': 'qīng', 'radical': '파랄 청', 'meaning': '푸르다'},
        ],
        'synonyms': [
            {'hanzi': '永葆青春', 'pinyin': 'yǒng bǎo qīng chūn', 'meaning': '영원히 청춘을 유지하다'},
            {'hanzi': '历久弥新', 'pinyin': 'lì jiǔ mí xīn', 'meaning': '오래될수록 더 새롭다'},
        ]
    },
    {
        'rank': 18,
        'hanzi': '万马奔腾',
        'pinyin': 'Wàn mǎ bēn téng',
        'meaning_ko': '수만 마리 말이 달린다',
        'source': '중국 고대 성어',
        'etymology': '만 마리 말이 달린다는 뜻으로 거대한 세력이 움직임을 의미.',
        'characters': [
            {'hanzi': '万', 'pinyin': 'wàn', 'radical': '만 만', 'meaning': '만, 많음'},
            {'hanzi': '马', 'pinyin': 'mǎ', 'radical': '말 마', 'meaning': '말'},
            {'hanzi': '奔', 'pinyin': 'bēn', 'radical': '달 분', 'meaning': '달리다'},
            {'hanzi': '腾', 'pinyin': 'téng', 'radical': '뛸 등', 'meaning': '뛰다, 솟아오르다'},
        ],
        'synonyms': [
            {'hanzi': '群雄并起', 'pinyin': 'qún xióng bìng qǐ', 'meaning': '여러 영웅이 동시에 나타나다'},
            {'hanzi': '浩浩荡荡', 'pinyin': 'háo háo dàng dàng', 'meaning': '거대하고 위풍당당하다'},
        ]
    },
    {
        'rank': 19,
        'hanzi': '万人空巷',
        'pinyin': 'Wàn rén kōng xiàng',
        'meaning_ko': '만 명이 거리로 몰려나간다',
        'source': '중국 고대 성어',
        'etymology': '만 명의 사람이 거리를 비운다는 뜻으로 매우 많은 사람이 한 곳으로 몰린다는 의미.',
        'characters': [
            {'hanzi': '万', 'pinyin': 'wàn', 'radical': '만 만', 'meaning': '만, 많음'},
            {'hanzi': '人', 'pinyin': 'rén', 'radical': '사람 인', 'meaning': '사람'},
            {'hanzi': '空', 'pinyin': 'kōng', 'radical': '빌 공', 'meaning': '비다'},
            {'hanzi': '巷', 'pinyin': 'xiàng', 'radical': '골목 항', 'meaning': '거리'},
        ],
        'synonyms': [
            {'hanzi': '人山人海', 'pinyin': 'rén shān rén hǎi', 'meaning': '사람이 산과 바다 같이 많다'},
            {'hanzi': '大街小巷', 'pinyin': 'dà jiē xiǎo xiàng', 'meaning': '큰 거리 작은 거리'},
        ]
    },
    {
        'rank': 20,
        'hanzi': '十年磨剑',
        'pinyin': 'Shí nián mó jiàn',
        'meaning_ko': '십 년간 칼을 갈다',
        'source': '중국 고대 성어',
        'etymology': '십 년이라는 오랜 세월동안 칼을 갈아 날을 세운다는 뜻으로 오랜 준비와 연습을 의미.',
        'characters': [
            {'hanzi': '十', 'pinyin': 'shí', 'radical': '열 십', 'meaning': '열'},
            {'hanzi': '年', 'pinyin': 'nián', 'radical': '해 년', 'meaning': '년, 오랜 시간'},
            {'hanzi': '磨', 'pinyin': 'mó', 'radical': '갈 마', 'meaning': '가는 돌, 갈다'},
            {'hanzi': '剑', 'pinyin': 'jiàn', 'radical': '칼 검', 'meaning': '칼'},
        ],
        'synonyms': [
            {'hanzi': '十年寒窗', 'pinyin': 'shí nián hán chuāng', 'meaning': '십 년 추운 창문 앞에서 공부하다'},
            {'hanzi': '厚积薄发', 'pinyin': 'hòu jī báo fā', 'meaning': '두텁게 쌓아 얇게 터뜨리다'},
        ]
    },
    # 21-30
    {
        'rank': 21,
        'hanzi': '一飞冲天',
        'pinyin': 'Yī fēi chōng tiān',
        'meaning_ko': '한 번에 하늘로 솟아오르다',
        'source': '중국 고대 성어',
        'etymology': '날개를 펼쳐 하늘로 솟아오른다는 뜻으로 갑자기 성공하거나 승진함을 의미.',
        'characters': [
            {'hanzi': '一', 'pinyin': 'yī', 'radical': '하나 일', 'meaning': '하나, 한 번에'},
            {'hanzi': '飞', 'pinyin': 'fēi', 'radical': '날 비', 'meaning': '날다'},
            {'hanzi': '冲', 'pinyin': 'chōng', 'radical': '돌진 충', 'meaning': '돌진하다'},
            {'hanzi': '天', 'pinyin': 'tiān', 'radical': '하늘 천', 'meaning': '하늘'},
        ],
        'synonyms': [
            {'hanzi': '鹏程万里', 'pinyin': 'péng chéng wàn lǐ', 'meaning': '붕새가 만 리를 날다'},
            {'hanzi': '飞黄腾达', 'pinyin': 'fēi huáng téng dá', 'meaning': '날게 되어 높이 오르다'},
        ]
    },
    {
        'rank': 22,
        'hanzi': '一鼓作气',
        'pinyin': 'Yī gǔ zuò qì',
        'meaning_ko': '한 번의 북소리로 기운이 난다',
        'source': '『좌전』',
        'etymology': '처음 공격할 때의 기운이 가장 세다는 뜻으로 첫 시도가 중요함을 의미.',
        'characters': [
            {'hanzi': '一', 'pinyin': 'yī', 'radical': '하나 일', 'meaning': '하나, 한 번'},
            {'hanzi': '鼓', 'pinyin': 'gǔ', 'radical': '북 고', 'meaning': '북, 두드리다'},
            {'hanzi': '作', 'pinyin': 'zuò', 'radical': '할 작', 'meaning': '만들다, 나타나다'},
            {'hanzi': '气', 'pinyin': 'qì', 'radical': '기운 기', 'meaning': '기운, 날씨'},
        ],
        'synonyms': [
            {'hanzi': '趁热打铁', 'pinyin': 'chèn rè dǎ tiě', 'meaning': '뜨거울 때 쇠를 친다'},
            {'hanzi': '一鼓而下', 'pinyin': 'yī gǔ ér xià', 'meaning': '한 번의 공격으로 내려오다'},
        ]
    },
    {
        'rank': 23,
        'hanzi': '一日千里',
        'pinyin': 'Yī rì qiān lǐ',
        'meaning_ko': '하루에 천 리를 간다',
        'source': '중국 고대 성어',
        'etymology': '하루에 천 리를 달린다는 뜻으로 매우 빠른 속도로 진행됨을 의미.',
        'characters': [
            {'hanzi': '一', 'pinyin': 'yī', 'radical': '하나 일', 'meaning': '하나'},
            {'hanzi': '日', 'pinyin': 'rì', 'radical': '날 일', 'meaning': '날'},
            {'hanzi': '千', 'pinyin': 'qiān', 'radical': '천 천', 'meaning': '천'},
            {'hanzi': '里', 'pinyin': 'lǐ', 'radical': '마을 리', 'meaning': '마을, 거리'},
        ],
        'synonyms': [
            {'hanzi': '日新月异', 'pinyin': 'rì xīn yuè yì', 'meaning': '날마다 새롭고 달마다 다르다'},
            {'hanzi': '突飞猛进', 'pinyin': 'tū fēi měng jìn', 'meaning': '갑자기 빠르게 나아가다'},
        ]
    },
    {
        'rank': 24,
        'hanzi': '一鸣惊人',
        'pinyin': 'Yī míng jīng rén',
        'meaning_ko': '한 번 울어 사람을 놀라게 한다',
        'source': '『사마천 사기』',
        'etymology': '조용하다가 갑자기 큰 성공을 거둔다는 뜻으로 주목할 만한 성과를 의미.',
        'characters': [
            {'hanzi': '一', 'pinyin': 'yī', 'radical': '하나 일', 'meaning': '하나'},
            {'hanzi': '鸣', 'pinyin': 'míng', 'radical': '울 명', 'meaning': '울다'},
            {'hanzi': '惊', 'pinyin': 'jīng', 'radical': '놀랄 경', 'meaning': '놀라다'},
            {'hanzi': '人', 'pinyin': 'rén', 'radical': '사람 인', 'meaning': '사람'},
        ],
        'synonyms': [
            {'hanzi': '一飞冲天', 'pinyin': 'yī fēi chōng tiān', 'meaning': '한 번에 하늘로 솟다'},
            {'hanzi': '声名远播', 'pinyin': 'shēng míng yuǎn bō', 'meaning': '소리와 이름이 멀리 퍼진다'},
        ]
    },
    {
        'rank': 25,
        'hanzi': '一往无前',
        'pinyin': 'Yī wǎng wú qián',
        'meaning_ko': '한 번 가면 앞으로 멈추지 않는다',
        'source': '중국 고대 성어',
        'etymology': '한번 시작하면 앞으로 나아가기만 하고 멈추지 않는다는 뜻으로 용감하고 단호함을 의미.',
        'characters': [
            {'hanzi': '一', 'pinyin': 'yī', 'radical': '하나 일', 'meaning': '하나'},
            {'hanzi': '往', 'pinyin': 'wǎng', 'radical': '갈 왕', 'meaning': '가다'},
            {'hanzi': '无', 'pinyin': 'wú', 'radical': '없을 무', 'meaning': '없다'},
            {'hanzi': '前', 'pinyin': 'qián', 'radical': '앞 전', 'meaning': '앞'},
        ],
        'synonyms': [
            {'hanzi': '一往直前', 'pinyin': 'yī wǎng zhí qián', 'meaning': '일직선으로 앞으로 간다'},
            {'hanzi': '勇往直前', 'pinyin': 'yǒng wǎng zhí qián', 'meaning': '용감하게 앞으로 간다'},
        ]
    },
    {
        'rank': 26,
        'hanzi': '两全其美',
        'pinyin': 'Liǎng quán qí měi',
        'meaning_ko': '둘 다 완전하게 이루어진다',
        'source': '중국 고대 성어',
        'etymology': '둘을 다 온전히 보존한다는 뜻으로 두 가지를 모두 만족시킬 수 있음을 의미.',
        'characters': [
            {'hanzi': '两', 'pinyin': 'liǎng', 'radical': '둘 량', 'meaning': '둘'},
            {'hanzi': '全', 'pinyin': 'quán', 'radical': '온전할 전', 'meaning': '온전하다'},
            {'hanzi': '其', 'pinyin': 'qī', 'radical': '그 기', 'meaning': '그'},
            {'hanzi': '美', 'pinyin': 'měi', 'radical': '아름다울 미', 'meaning': '아름답다'},
        ],
        'synonyms': [
            {'hanzi': '一举两得', 'pinyin': 'yī jǔ liǎng dé', 'meaning': '한 번의 행동으로 두 가지를 얻다'},
            {'hanzi': '鱼和熊掌', 'pinyin': 'yú hé xióng zhǎng', 'meaning': '물고기와 곰의 발바닥'},
        ]
    },
    {
        'rank': 27,
        'hanzi': '三人成虎',
        'pinyin': 'Sān rén chéng hǔ',
        'meaning_ko': '세 사람이 호랑이를 만든다',
        'source': '『전국책』',
        'etymology': '세 사람이 같은 말을 하면 거짓도 사실이 된다는 뜻으로 여론의 힘을 강조.',
        'characters': [
            {'hanzi': '三', 'pinyin': 'sān', 'radical': '셋 삼', 'meaning': '셋'},
            {'hanzi': '人', 'pinyin': 'rén', 'radical': '사람 인', 'meaning': '사람'},
            {'hanzi': '成', 'pinyin': 'chéng', 'radical': '될 성', 'meaning': '되다'},
            {'hanzi': '虎', 'pinyin': 'hǔ', 'radical': '호랑이 호', 'meaning': '호랑이'},
        ],
        'synonyms': [
            {'hanzi': '众口铄金', 'pinyin': 'zhòng kǒu shuò jīn', 'meaning': '많은 입이 쇠를 녹인다'},
            {'hanzi': '谣言四起', 'pinyin': 'yáo yán sì qǐ', 'meaning': '거짓 소문이 사방으로 일어난다'},
        ]
    },
    {
        'rank': 28,
        'hanzi': '三思而行',
        'pinyin': 'Sān sī ér xíng',
        'meaning_ko': '세 번 생각하고 행동한다',
        'source': '『논어』',
        'etymology': '행동하기 전에 충분히 생각한다는 뜻으로 신중함을 강조.',
        'characters': [
            {'hanzi': '三', 'pinyin': 'sān', 'radical': '셋 삼', 'meaning': '셋'},
            {'hanzi': '思', 'pinyin': 'sī', 'radical': '생각 사', 'meaning': '생각하다'},
            {'hanzi': '而', 'pinyin': 'ér', 'radical': '그리고 이', 'meaning': '그리고'},
            {'hanzi': '行', 'pinyin': 'xíng', 'radical': '갈 행', 'meaning': '간다'},
        ],
        'synonyms': [
            {'hanzi': '深思熟虑', 'pinyin': 'shēn sī shú lǜ', 'meaning': '깊이 생각하고 익숙하게 고려한다'},
            {'hanzi': '谨慎小心', 'pinyin': 'jǐn shèn xiǎo xīn', 'meaning': '신중하고 조심하다'},
        ]
    },
    {
        'rank': 29,
        'hanzi': '不可一世',
        'pinyin': 'Bù kě yī shì',
        'meaning_ko': '한 세상도 견딜 수 없다',
        'source': '『사마천 사기』',
        'etymology': '한 세상도 자신을 견딜 수 없다는 뜻으로 매우 오만한 태도를 의미.',
        'characters': [
            {'hanzi': '不', 'pinyin': 'bù', 'radical': '아닐 불', 'meaning': '아니다'},
            {'hanzi': '可', 'pinyin': 'kě', 'radical': '가능할 가', 'meaning': '가능하다'},
            {'hanzi': '一', 'pinyin': 'yī', 'radical': '하나 일', 'meaning': '하나'},
            {'hanzi': '世', 'pinyin': 'shì', 'radical': '세상 세', 'meaning': '세상'},
        ],
        'synonyms': [
            {'hanzi': '目中无人', 'pinyin': 'mù zhōng wú rén', 'meaning': '눈에 사람이 없다'},
            {'hanzi': '自高自大', 'pinyin': 'zì gāo zì dà', 'meaning': '자신을 높이고 크게 여기다'},
        ]
    },
    {
        'rank': 30,
        'hanzi': '不入流',
        'pinyin': 'Bù rù liú',
        'meaning_ko': '흐름에 들어가지 못한다',
        'source': '중국 고대 성어',
        'etymology': '흐름에 속하지 못한다는 뜻으로 수준이 낮고 별로 중요하지 않음을 의미.',
        'characters': [
            {'hanzi': '不', 'pinyin': 'bù', 'radical': '아닐 불', 'meaning': '아니다'},
            {'hanzi': '入', 'pinyin': 'rù', 'radical': '들 입', 'meaning': '들어가다'},
            {'hanzi': '流', 'pinyin': 'liú', 'radical': '흐를 류', 'meaning': '흐른다, 흐름'},
            {'hanzi': '派', 'pinyin': 'pài', 'radical': '파 파', 'meaning': '파, 종파'},
        ],
        'synonyms': [
            {'hanzi': '下三滥', 'pinyin': 'xià sān làn', 'meaning': '아래 세 가지 천하다'},
            {'hanzi': '小人之心', 'pinyin': 'xiǎo rén zhī xīn', 'meaning': '작은 사람의 마음'},
        ]
    },
]

# 추가 성어들 (31-200) - 계속 추가할 데이터
# 이 부분은 각 성어의 상세 정보를 포함하여 더 확장됩니다

def generate_markdown_by_group(chengyu_data, start_idx, end_idx, file_number):
    """50개씩 그룹화된 마크다운 생성"""
    md_content = f"# 4자성어 (四字成語) - 파일 {file_number}\n\n"
    md_content += f"> 순위: {start_idx}-{end_idx}번\n"
    md_content += f"> 수준: 광범위 학습\n"
    md_content += f"> 성어 수: {len(chengyu_data[start_idx-1:end_idx])}개\n\n"
    md_content += "---\n\n"

    for idiom in chengyu_data[start_idx-1:end_idx]:
        md_content += f"### {idiom['rank']}. {idiom['hanzi']} / {idiom['pinyin']} / [성어] / {idiom['meaning_ko']}\n\n"
        md_content += f"- 원문: {idiom['hanzi']} ({idiom['pinyin']}) — {idiom['source']}\n"
        md_content += f"- 유래: {idiom['etymology']}\n"
        md_content += f"- 글자별 풀이:\n"
        for char in idiom['characters']:
            md_content += f"  - {char['hanzi']} ({char['pinyin']}): {char['radical']} — {char['meaning']}\n"
        md_content += f"- 유의어:\n"
        for syn in idiom['synonyms']:
            md_content += f"  - {syn['hanzi']} ({syn['pinyin']}): {syn['meaning']}\n"
        md_content += f"\n---\n\n"

    return md_content

# 현재 완성된 30개 성어로 테스트 생성
output_dir = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Idioms")
output_dir.mkdir(parents=True, exist_ok=True)

# i01_Top.md (1-30 생성, 향후 50까지 확장)
md = generate_markdown_by_group(chengyu_list, 1, min(30, len(chengyu_list)), 1)
with open(output_dir / "i01_Top.md", 'w', encoding='utf-8') as f:
    f.write(md)

print(f"생성된 4자성어: {len(chengyu_list)}개")
print(f"필요한 성어: {200 - len(chengyu_list)}개")
print(f"\n현재 진행:")
print(f"- i01_Top.md (1-30): 생성 완료")
print(f"- i02_Top.md (51-100): 70개 추가 필요")
print(f"- i03_Top.md (101-150): 50개 추가 필요")
print(f"- i04_Top.md (151-200): 50개 추가 필요")
print(f"\n파일 경로: Doc/Markdown/hsk-themes/Idioms/")
