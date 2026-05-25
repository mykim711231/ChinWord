# ChinWord — 듀얼 배포 푸시 가이드

이 문서는 ChinWord 저장소를 **두 개의 GitHub 계정**으로 동시에 푸시하고, **양쪽 모두 GitHub Pages 로 자동 배포**되도록 만들기까지의 전체 절차와 트러블슈팅을 정리한 것입니다.

---

## 1. 개요

- **개발 계정**: `gababayo` (claude code 작업 계정)
- **배포 계정**: `mykim711231` (실제 공개용 계정)
- **목표**: 로컬에서 `push.ps1` 한 번 실행 → 두 저장소 모두 푸시 → 두 Pages 사이트 모두 자동 갱신

배포 URL:

| Remote | 저장소 | Pages URL |
|---|---|---|
| `origin` | `gababayo/ChinWord` | https://gababayo.github.io/ChinWord/ |
| `mykim` | `mykim711231/ChinWord` | https://mykim711231.github.io/ChinWord/ |

---

## 2. 현재 구성

### 2.1 로컬 리모트

```
origin  https://github.com/gababayo/ChinWord.git
mykim   https://github.com/mykim711231/ChinWord.git
```

> 자격증명은 URL에 박지 않고 Git Credential Manager(GCM) 에 위임. gababayo 토큰 하나로 양쪽 푸시 가능 (mykim 쪽은 collaborator 권한으로 허용).

### 2.2 `push.ps1`

```powershell
Set-Location "D:\_Git\ChinWord"

git push origin main
git push mykim main
```

> 단순한 순차 푸시. 한쪽이 실패해도 다른 쪽 시도는 진행됨.

### 2.3 자동 배포 워크플로

파일: `.github/workflows/deploy.yml`

핵심 동작:
- `main` 브랜치에 `app/**`, `Doc/Markdown/**`, 또는 워크플로 자체가 변경된 push 시 트리거
- `app/` 디렉터리에서 `npm ci && npm run build`
- 빌드 결과 (`app/dist`) 를 GitHub Pages 아티팩트로 업로드 → 배포
- **양쪽 저장소에 동일 워크플로가 있으므로, 푸시 한 번에 두 사이트 모두 자동 갱신**

> `base` 경로는 `app/vite.config.ts` 의 기본값 `/ChinWord/` 를 그대로 사용. 두 계정 모두 저장소 이름이 동일(`ChinWord`)하기 때문에 별도 분기 불필요.

---

## 3. 일상 사용

```powershell
D:\_Git\ChinWord\push.ps1
```

정상 출력 예:

```
To https://github.com/gababayo/ChinWord.git
   xxxxxxx..yyyyyyy  main -> main
To https://github.com/mykim711231/ChinWord.git
   xxxxxxx..yyyyyyy  main -> main
```

이후 1–2 분 내 Actions 가 양쪽 저장소에서 각각 실행되며, 두 Pages URL 이 동기화됩니다.

진행 상황 확인:
- https://github.com/gababayo/ChinWord/actions
- https://github.com/mykim711231/ChinWord/actions

---

## 4. 초기 셋업 (1회만, 기록용)

다른 머신에서 클론한다면 아래 순서대로 1회 셋업.

### 4.1 두 번째 리모트 추가

```powershell
git remote add mykim https://github.com/mykim711231/ChinWord.git
```

> URL 안에 `<PAT>` 같은 placeholder 를 박지 말 것. GCM 위임이 가장 안정적임.

### 4.2 mykim 저장소에 gababayo 를 Collaborator 로 추가

**mykim711231 계정으로 로그인**한 상태에서:

1. https://github.com/mykim711231/ChinWord/settings/access
2. **Add people** → `gababayo` 입력 → **Write** 권한 선택 → Add
3. **gababayo 계정으로 전환** → 이메일 또는 https://github.com/mykim711231/ChinWord/invitations 에서 **Accept invitation**

### 4.3 GCM 자격증명 확인

```powershell
git config --get credential.helper
# manager  ← Git for Windows 기본
```

첫 푸시 시 브라우저 OAuth 창이 뜨면 **gababayo** 계정으로 로그인. 이후 GCM 가 토큰을 보관.

### 4.4 양쪽 저장소에 Pages 활성화

각 계정으로 로그인 후:

- https://github.com/gababayo/ChinWord/settings/pages
- https://github.com/mykim711231/ChinWord/settings/pages

**Source** 드롭다운에서 `GitHub Actions` 선택 (자동 저장).

### 4.5 첫 푸시 (이력이 비어 있을 때)

mykim 쪽이 GitHub UI 에서 README 와 함께 생성되었다면, 첫 푸시는 **non-fast-forward** 거부가 납니다. 일회성으로 강제 푸시:

```powershell
git push mykim main --force-with-lease
```

> `--force-with-lease` 는 원격이 예상치 못한 커밋을 갖고 있을 경우 안전하게 거부됨. `--force` 보다 항상 우선 사용.

---

## 5. 트러블슈팅

실제 이 프로젝트에서 마주친 에러와 해결책 (순서대로):

### 5.1 `403 Permission denied`

```
remote: Permission to mykim711231/ChinWord.git denied to gababayo.
fatal: ... The requested URL returned error: 403
```

**원인**: gababayo 가 mykim711231/ChinWord 의 collaborator 가 아니거나, 초대를 아직 수락하지 않음.

**해결**: 4.2 단계 다시 — collaborator 추가 + 수락.

---

### 5.2 `Invalid username or token`

```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/mykim711231/ChinWord.git/'
```

**원인**: 리모트 URL 안에 `<PAT>` 같은 placeholder 가 박혀 있음. 또는 GCM 캐시가 깨짐.

**해결 1** — URL 점검:

```powershell
git config --get remote.mykim.url
# 만약 https://...:<PAT>@... 처럼 가짜 토큰이 보이면 깔끔하게 재설정:
git remote set-url mykim https://github.com/mykim711231/ChinWord.git
```

**해결 2** — GCM 자격증명 초기화:

```powershell
git credential-manager erase
# 프롬프트:
#   protocol=https
#   host=github.com
#   (빈 줄 Enter)
```

이후 `push.ps1` 재실행 시 브라우저 OAuth 창에 **gababayo 계정**으로 다시 로그인.

---

### 5.3 `non-fast-forward`

```
! [rejected]        main -> main (non-fast-forward)
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart.
```

**원인**: 원격에 로컬에 없는 커밋이 있음. 보통 GitHub UI 에서 저장소 생성 시 자동 생성된 `Initial commit` (README).

**진단**:

```powershell
git fetch mykim
git log --oneline main..mykim/main   # 원격에만 있는 커밋 확인
```

**해결**:
- 원격 커밋이 정말 placeholder(빈 README 등) 라면 force:
  ```powershell
  git push mykim main --force-with-lease
  ```
- 보존이 필요하면 rebase 또는 merge 후 일반 push.

---

### 5.4 Pages 가 빈 화면 / 404

**원인 후보**:
1. `vite.config.ts` 의 `base` 가 저장소 이름과 다름 → 자산 URL 미스매치
2. Pages Source 가 `GitHub Actions` 가 아닌 `Deploy from a branch` 로 설정됨
3. Actions 가 아직 안 끝났거나 실패

**점검**:
- `app/vite.config.ts` → `base: '/ChinWord/'` 인지 확인
- Settings → Pages → Source = `GitHub Actions`
- Actions 탭에서 최신 워크플로 로그 확인

---

### 5.5 Actions 가 트리거되지 않음

**원인**: `deploy.yml` 의 `paths` 필터에 해당 변경이 안 잡힘. 워크플로는 다음 경로 변경에만 트리거:

```yaml
paths:
  - "app/**"
  - "Doc/Markdown/**"
  - ".github/workflows/deploy.yml"
```

루트의 `push.md` 같은 파일만 변경된 푸시는 트리거되지 않음 — **정상 동작**.

수동 실행이 필요하면 Actions 탭 → `Deploy to GitHub Pages` → **Run workflow** 버튼.

---

## 6. 배포 흐름 (요약)

```
[ 로컬 ]
   │
   │ push.ps1
   ▼
git push origin main ──► gababayo/ChinWord ──► Actions ──► gababayo.github.io/ChinWord/
git push mykim  main ──► mykim711231/ChinWord ─► Actions ──► mykim711231.github.io/ChinWord/
```

각 저장소는 **자체 워크플로 / 자체 Pages 환경** 으로 완전히 독립 배포되며, 워크플로 파일은 동일하지만 GitHub 가 자동으로 해당 저장소의 Pages 사이트로 라우팅합니다.

---

## 7. 자주 쓰는 보조 명령

```powershell
# 리모트 현황
git remote -v

# 특정 리모트의 URL만 보기
git config --get remote.mykim.url

# 리모트 URL 재설정
git remote set-url mykim https://github.com/mykim711231/ChinWord.git

# 리모트 main 과 로컬 main 비교
git fetch mykim
git log --oneline main..mykim/main   # 원격에만 있는 커밋
git log --oneline mykim/main..main   # 로컬에만 있는 커밋

# 자격증명 캐시 삭제 (재로그인 강제)
git credential-manager erase

# 워크플로 수동 실행 (Actions 탭에서)
#   Run workflow 버튼

# Force push (안전 버전)
git push mykim main --force-with-lease
```

---

## 8. 변경 이력

- 2026-05-25: 초안 — collaborator 단축 안내
- 2026-05-25: 듀얼 푸시 / Pages 자동 배포 / 마주친 에러 4종 / 강제 푸시 절차 통합
