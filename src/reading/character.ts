/** 일간 10종 → 공유 카드 캐릭터. 결정론 상수 — 문구 변경 시 이미 발급된 카드(스냅샷)는 불변. */
export interface SajuCharacter {
  name: string;
  line: string;
}

const CHARACTERS: Record<string, SajuCharacter> = {
  甲: { name: '우직한 큰나무형', line: '뿌리가 깊어 흔들리지 않는 사람이에요' },
  乙: { name: '유연한 들꽃형', line: '어디서든 부드럽게 피어나는 사람이에요' },
  丙: { name: '빛나는 태양형', line: '곁에 있으면 절로 환해지는 사람이에요' },
  丁: { name: '따뜻한 촛불형', line: '조용히 오래 곁을 밝히는 사람이에요' },
  戊: { name: '든든한 큰산형', line: '기대도 무너지지 않는 사람이에요' },
  己: { name: '포근한 들판형', line: '무엇이든 품어 키워내는 사람이에요' },
  庚: { name: '단단한 바위형', line: '한번 마음먹으면 끝까지 가는 사람이에요' },
  辛: { name: '반짝이는 보석형', line: '섬세한 감각이 빛나는 사람이에요' },
  壬: { name: '깊은 바다형', line: '알수록 속이 깊어 놀라운 사람이에요' },
  癸: { name: '맑은 이슬비형', line: '조용히 스며들어 마음을 적시는 사람이에요' },
};

const FALLBACK: SajuCharacter = { name: '신비로운 도토리형', line: '알수록 매력이 나오는 사람이에요' };

const STEM_KO: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무',
  己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
};
const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export function characterForDayStem(stem: string): SajuCharacter {
  return CHARACTERS[stem] ?? FALLBACK;
}

/** 카드 표기용 일간 라벨. 예: "갑(木) 일간". 미상 천간은 "일간 미상". */
export function stemCardLabel(stem: string): string {
  const ko = STEM_KO[stem];
  const el = STEM_ELEMENT[stem];
  return ko && el ? `${ko}(${el}) 일간` : '일간 미상';
}
