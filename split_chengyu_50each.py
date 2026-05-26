from pathlib import Path

def split_idiom_files():
    """100개씩 2개 파일을 50개씩 4개 파일로 분리"""
    output_dir = Path(r"D:\_Git\ChinWord\Doc\Markdown\hsk-themes\Idioms")

    # 기존 i01, i02 파일 읽기
    with open(output_dir / "i01_Top.md", 'r', encoding='utf-8') as f:
        content_i01 = f.read()

    with open(output_dir / "i02_Top.md", 'r', encoding='utf-8') as f:
        content_i02 = f.read()

    # 파일 구분 (1-50, 51-100, 101-150, 151-200)
    def extract_idioms(content, start_rank, end_rank):
        """특정 범위의 성어만 추출"""
        lines = content.split('\n')
        result = []
        in_idiom = False
        current_rank = None
        idiom_block = []

        for line in lines:
            # 성어 시작 감지
            if line.startswith('### '):
                try:
                    rank = int(line.split('.')[0].replace('###', '').strip())
                    if start_rank <= rank <= end_rank:
                        if idiom_block:
                            result.extend(idiom_block)
                        idiom_block = [line]
                        current_rank = rank
                        in_idiom = True
                    elif current_rank is not None and rank > end_rank:
                        if idiom_block:
                            result.extend(idiom_block)
                        break
                except:
                    pass
            elif in_idiom:
                idiom_block.append(line)

        if idiom_block:
            result.extend(idiom_block)

        return '\n'.join(result)

    # 4개 파일 생성
    configs = [
        (1, 50, 'i01_Top.md', '1~50'),
        (51, 100, 'i02_Top.md', '51~100'),
        (101, 150, 'i03_Top.md', '101~150'),
        (151, 200, 'i04_Top.md', '151~200'),
    ]

    for start, end, filename, range_str in configs:
        # 헤더 작성
        header = f"# 4자성어 (四字成語) - {range_str}\n\n"
        header += f"> 순위: {start}-{end}번\n"
        header += f"> 수준: 광범위 학습 (200개 중)\n"
        header += f"> 성어 수: {end - start + 1}개\n\n"
        header += "---\n\n"

        # 1-50번은 i01에서, 51-100번은 i02에서, 101-150번은 i02에서, 151-200번은 i02에서 추출
        if start <= 50:
            idioms = extract_idioms(content_i01, start, min(end, 100))
        elif start <= 100:
            idioms = extract_idioms(content_i01, start, min(end, 100))
        elif start <= 150:
            idioms = extract_idioms(content_i02, start, min(end, 200))
        else:
            idioms = extract_idioms(content_i02, start, 200)

        # 파일 작성
        full_content = header + idioms

        with open(output_dir / filename, 'w', encoding='utf-8') as f:
            f.write(full_content)

        print(f"- {filename} ({range_str}번): 생성 완료")

    print(f"\n완료: 4개 파일로 50개씩 분리")
    print(f"구조: Adv 폴더와 달리 50개씩 균등 분배로 학습 최적화")

split_idiom_files()
