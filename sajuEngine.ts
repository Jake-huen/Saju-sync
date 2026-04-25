import { calculateFourPillars } from 'manseryeok';

// 오행 타입 정의
export type Ohang = '木' | '火' | '土' | '金' | '水';

export interface Pillar {
  stem: string;
  stemHanzi: string;
  stemTenStar: string;
  stemElement: Ohang;
  branch: string;
  branchHanzi: string;
  branchTenStar: string;
  branchElement: Ohang;
}

export interface SajuProfile {
  dayMaster: Ohang; // 일간 (나의 본질)
  lackingElements: Ohang[]; // 부족한 오행
  dominantElement: Ohang; // 과다한 오행
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  elementPercentages: Record<Ohang, number>;
  ilju: string; // 일주 (예: 신유)
  iljuHanzi: string; // 일주 한자 (예: 辛酉)
  dayMasterDescription: string; // 일간 성향 설명
  yinYangCount: { yang: number; yin: number }; // 음양 개수
  gender: 'male' | 'female';
  singangScore: number; // 신강/신약 점수 (0~100)
  singangType: string; // 극신약, 신약, 중화, 신강, 극신강
  shipseongPercentages: Record<string, number>; // 십성별 비율
  iljinCalendar: { date: string; korean: string; hanja: string; element: Ohang }[]; // 일진 달력
}

// 천간/지지 한자 및 속성 매핑
const STEMS: Record<string, { hanzi: string, el: Ohang, yinYang: '+' | '-' }> = {
  '갑': {hanzi: '甲', el: '木', yinYang: '+'}, '을': {hanzi: '乙', el: '木', yinYang: '-'},
  '병': {hanzi: '丙', el: '火', yinYang: '+'}, '정': {hanzi: '丁', el: '火', yinYang: '-'},
  '무': {hanzi: '戊', el: '土', yinYang: '+'}, '기': {hanzi: '己', el: '土', yinYang: '-'},
  '경': {hanzi: '庚', el: '金', yinYang: '+'}, '신': {hanzi: '辛', el: '金', yinYang: '-'},
  '임': {hanzi: '壬', el: '水', yinYang: '+'}, '계': {hanzi: '癸', el: '水', yinYang: '-'},
};
const BRANCHES: Record<string, { hanzi: string, el: Ohang, yinYang: '+' | '-' }> = {
  '자': {hanzi: '子', el: '水', yinYang: '-'}, '축': {hanzi: '丑', el: '土', yinYang: '-'},
  '인': {hanzi: '寅', el: '木', yinYang: '+'}, '묘': {hanzi: '卯', el: '木', yinYang: '-'},
  '진': {hanzi: '辰', el: '土', yinYang: '+'}, '사': {hanzi: '巳', el: '火', yinYang: '+'},
  '오': {hanzi: '午', el: '火', yinYang: '-'}, '미': {hanzi: '未', el: '土', yinYang: '-'},
  '신': {hanzi: '申', el: '金', yinYang: '+'}, '유': {hanzi: '酉', el: '金', yinYang: '-'},
  '술': {hanzi: '戌', el: '土', yinYang: '+'}, '해': {hanzi: '亥', el: '水', yinYang: '+'},
};

// 십성(Ten Stars) 계산 로직
const calculateTenStar = (dayMaster: string, target: string, isBranch: boolean): string => {
  const dmInfo = STEMS[dayMaster];
  const targetInfo = isBranch ? BRANCHES[target] : STEMS[target];
  if (!dmInfo || !targetInfo || (dayMaster === target && !isBranch)) return '나'; // 일간 본인

  const elements = ['木', '火', '土', '金', '水'];
  const diff = (elements.indexOf(targetInfo.el) - elements.indexOf(dmInfo.el) + 5) % 5;
  const samePolarity = dmInfo.yinYang === targetInfo.yinYang;

  if (diff === 0) return samePolarity ? '비견' : '겁재';
  if (diff === 1) return samePolarity ? '식신' : '상관';
  if (diff === 2) return samePolarity ? '편재' : '정재';
  if (diff === 3) return samePolarity ? '편관' : '정관';
  if (diff === 4) return samePolarity ? '편인' : '정인';
  return '';
};


// 1. 오행 밸런싱 알고리즘 (manseryeok 라이브러리 적용)
export const calculateOhangBalance = (birthDate: Date, gender: 'male' | 'female'): SajuProfile => {
  const result = calculateFourPillars({
    year: birthDate.getFullYear(),
    month: birthDate.getMonth() + 1, // JS Date는 월이 0부터 시작하므로 +1
    day: birthDate.getDate(),
    hour: birthDate.getHours(),
    minute: birthDate.getMinutes()
  });

  // 라이브러리의 공식 메서드를 사용하여 한글/한자 객체를 가져옵니다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hanjaObj = (result as any).toHanjaObject();

  // 일간(나의 본질) 추출 (예: '신유'의 '신')
  const dayMasterChar = hanjaObj.day.korean.charAt(0);
  
  // 각 기둥(Pillar) 조립 헬퍼
  const buildPillar = (pillarData: { korean: string, hanja: string }): Pillar => {
    const stem = pillarData.korean.charAt(0);
    const branch = pillarData.korean.charAt(1);
    return {
      stem,
      stemHanzi: pillarData.hanja.charAt(0),
      stemTenStar: calculateTenStar(dayMasterChar, stem, false),
      stemElement: STEMS[stem]?.el || '木',
      branch,
      branchHanzi: pillarData.hanja.charAt(1),
      branchTenStar: calculateTenStar(dayMasterChar, branch, true),
      branchElement: BRANCHES[branch]?.el || '木',
    };
  };

  const pillars = {
    year: buildPillar(hanjaObj.year),
    month: buildPillar(hanjaObj.month),
    day: buildPillar(hanjaObj.day),
    hour: buildPillar(hanjaObj.hour),
  };

  // 일간(나)의 고유한 성향 설명 (물상론 기반)
  const dayMasterDescriptions: Record<string, string> = {
    '갑': '곧게 뻗어나가는 큰 나무',
    '을': '유연하고 환경 적응력이 뛰어난 화초',
    '병': '밝고 열정적으로 빛나는 태양',
    '정': '은은하게 주위를 밝히는 달/촛불',
    '무': '듬직하고 포용력 있는 큰 산',
    '기': '생명을 품어 기르는 비옥한 들판',
    '경': '단단하고 결단력 있는 바위/무쇠',
    '신': '예리하고 섬세하게 빛나는 보석',
    '임': '깊고 지혜를 품은 넓은 바다',
    '계': '맑고 생명력을 불어넣는 비/이슬',
  };

  // 사주 8글자의 오행을 모두 추출
  const elementsInSaju = [
    pillars.year.stemElement, pillars.year.branchElement,
    pillars.month.stemElement, pillars.month.branchElement,
    pillars.day.stemElement, pillars.day.branchElement,
    pillars.hour.stemElement, pillars.hour.branchElement,
  ];

  // 음양(陰陽) 비율 계산
  let yang = 0;
  let yin = 0;
  const countYinYang = (char: string, isBranch: boolean) => {
    const yy = isBranch ? BRANCHES[char]?.yinYang : STEMS[char]?.yinYang;
    if (yy === '+') yang++;
    if (yy === '-') yin++;
  };
  
  ['year', 'month', 'day', 'hour'].forEach(p => {
    countYinYang((pillars as any)[p].stem, false);
    countYinYang((pillars as any)[p].branch, true);
  });

  // 십성 비율 계산 (8글자 중 일간 제외 7글자 기준)
  const shipseongCount: Record<string, number> = {};
  const addShipseong = (ts: string) => {
    if (ts && ts !== '나') shipseongCount[ts] = (shipseongCount[ts] || 0) + 1;
  };
  ['year', 'month', 'day', 'hour'].forEach(p => {
    addShipseong((pillars as any)[p].stemTenStar);
    addShipseong((pillars as any)[p].branchTenStar);
  });
  const shipseongPercentages: Record<string, number> = {};
  for (const [key, val] of Object.entries(shipseongCount)) {
    shipseongPercentages[key] = (val / 7) * 100;
  }

  // 신강/신약 계산 (나를 돕는 기운: 비겁 + 인성)
  const supportingElements: Record<Ohang, Ohang[]> = {
    '木': ['木', '水'], '火': ['火', '木'], '土': ['土', '火'], '金': ['金', '土'], '水': ['水', '金'],
  };
  let singangScore = 0;
  elementsInSaju.forEach(e => {
    if (supportingElements[pillars.day.stemElement].includes(e)) singangScore += 12.5; // 8글자 각각 12.5%
  });
  let singangType = '중화(中和)';
  if (singangScore >= 70) singangType = '극신강(極身强)';
  else if (singangScore >= 55) singangType = '신강(身强)';
  else if (singangScore <= 30) singangType = '극신약(極身弱)';
  else if (singangScore < 45) singangType = '신약(身弱)';

  // 월지(득령), 일지(득지) 가중치 부여 (간단 보정)
  if (supportingElements[pillars.day.stemElement].includes(pillars.month.branchElement)) singangScore += 10;
  if (supportingElements[pillars.day.stemElement].includes(pillars.day.branchElement)) singangScore += 5;
  singangScore = Math.min(100, singangScore);

  // 일간(나의 본질) 오행
  const dayMaster = pillars.day.stemElement;

  // 오행 개수 카운트
  const countMap: Record<Ohang, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  elementsInSaju.forEach(e => countMap[e]++);

  // 가장 많은 기운(과다)과 없는 기운(부족) 계산
  let dominantElement = dayMaster;
  let maxCount = 0;
  for (const [element, count] of Object.entries(countMap)) {
    if (count > maxCount) {
      maxCount = count;
      dominantElement = element as Ohang;
    }
  }
  const lackingElements = (Object.keys(countMap) as Ohang[]).filter(e => countMap[e as Ohang] === 0);

  // 퍼센트 계산 (8글자 중 비율)
  const elementPercentages = {
    '木': (countMap['木'] / 8) * 100, '火': (countMap['火'] / 8) * 100,
    '土': (countMap['土'] / 8) * 100, '金': (countMap['金'] / 8) * 100,
    '水': (countMap['水'] / 8) * 100,
  };

  // 7일치 일진 달력 생성
  const iljinCalendar = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dailyRes = calculateFourPillars({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: 0, minute: 0 });
    const dailyHanja = (dailyRes as any).toHanjaObject().day;
    iljinCalendar.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      korean: dailyHanja.korean,
      hanja: dailyHanja.hanja,
      element: STEMS[dailyHanja.korean.charAt(0)]?.el || '木'
    });
  }

  return {
    dayMaster,
    lackingElements,
    dominantElement,
    pillars,
    elementPercentages,
    ilju: hanjaObj.day.korean,
    iljuHanzi: hanjaObj.day.hanja,
    dayMasterDescription: dayMasterDescriptions[dayMasterChar] || '',
    yinYangCount: { yang, yin },
    gender,
    singangScore,
    singangType,
    shipseongPercentages,
    iljinCalendar
  };
};

// [추가] 실제 API 연동을 위한 비동기 함수 템플릿
export const fetchActualOhangBalance = async (birthDate: Date, gender: 'male' | 'female'): Promise<SajuProfile> => {
  // manseryeok 라이브러리를 사용하면 클라이언트 단에서 바로 정확한 만세력 계산이 가능합니다.
  
  try {
    // 계산 중 로딩 애니메이션을 보여주기 위해 1초 대기 (UX 목적)
    await new Promise(resolve => setTimeout(resolve, 1000));
    return calculateOhangBalance(birthDate, gender); 
    
  } catch (error) {
    console.error("만세력 API 호출 실패:", error);
    // 에러 발생 시 App.tsx에서 얼럿(Alert) 처리하도록 에러를 던집니다.
    throw error;
  }
};


// 2. 시너지 매칭 (궁합 스코어 계산)
export const calculateSynergyScore = (mySaju: SajuProfile, partnerSaju: SajuProfile): number => {
  let score = 50; // 기본 점수
  
  // 상대방의 과다한 오행이 내가 부족한 오행을 채워주는지 확인
  if (mySaju.lackingElements.includes(partnerSaju.dominantElement)) {
    score += 30;
  }
  
  // 조후 용신 (온도 밸런스 - 수와 화의 조화 등)
  if ((mySaju.dayMaster === '水' && partnerSaju.dayMaster === '火') || 
      (mySaju.dayMaster === '火' && partnerSaju.dayMaster === '水')) {
    score += 20; 
  }

  return Math.min(score, 100);
};

// 3. 데이트 코스 큐레이션
export const getDateRecommendation = (neededOhang: Ohang): string => {
  const recommendations = {
    '木': '수목원 산책이나 플랜테리어 카페 데이트를 추천해요.',
    '火': '따뜻한 햇살이 드는 야외 테라스나 불멍 캠핑은 어떨까요?',
    '土': '도자기 공방 체험이나 흙길을 걸을 수 있는 공원이 좋아요.',
    '金': '세련된 금속 인테리어의 파인다이닝이나 갤러리 데이트!',
    '水': '한강 공원 피크닉이나 아쿠아리움 데이트를 추천해요 🐠'
  };
  return recommendations[neededOhang];
};