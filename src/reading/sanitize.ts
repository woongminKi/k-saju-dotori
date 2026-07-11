// 풀이 본문 출력 정리 + 원시데이터 누출 검출.
//   기존 tools/cli/format-output.ts 의 음슴체 출력 규약과 결이 같다(웹 제품에선 이 sanitize 가 그 역할을 흡수).

/** 코드펜스/JSON 래퍼를 벗기고 trim 한 본문을 돌려준다. */
export function sanitizeBody(raw: string): string {
  let s = raw.trim();

  const fence = s.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/);
  if (fence && fence[1] !== undefined) s = fence[1].trim();

  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s) as { body?: unknown };
      if (typeof o.body === 'string') s = o.body.trim();
    } catch {
      // JSON 아니면 원본 유지
    }
  }
  return s;
}

const RAW_LEAK_PATTERNS: RegExp[] = [
  /(적합도|점수|score|확률|breakdown)\s*[:=]?\s*\d\.\d+/i, // 라벨 붙은 내부 점수 노출
  /\b(breakdown|chartSummary|promptVersion|FullSajuChart|s\d_[a-zA-Z]+)\b/, // 내부 키·타입명
];

/** 내부 수치·키명 등 원시데이터가 본문에 새어나왔는지. */
export function hasRawLeak(text: string): boolean {
  return RAW_LEAK_PATTERNS.some((re) => re.test(text));
}
