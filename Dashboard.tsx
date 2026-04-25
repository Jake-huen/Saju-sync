import React from 'react';
import { SajuProfile } from './sajuEngine';

interface DashboardProps {
  profile: SajuProfile;
  onSelectMatch: (ohang: string) => void;
  recentUsers?: any[];
  onSelectPartner?: (partner: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onSelectMatch, recentUsers, onSelectPartner }) => {
  // 오행별 디자인 매핑
  const ohangEmoji: Record<string, string> = { '木': '🌳', '火': '🔥', '土': '⛰️', '金': '⚔️', '水': '🌊' };
  const ohangColor: Record<string, string> = { '木': 'text-green-400', '火': 'text-red-400', '土': 'text-yellow-600', '金': 'text-gray-300', '水': 'text-blue-400' };
  const ohangBgColor: Record<string, string> = { '木': 'bg-green-500', '火': 'bg-red-500', '土': 'bg-yellow-600', '金': 'bg-gray-400', '水': 'bg-blue-500' };

  // 사주 기둥(Pillar) 렌더링 헬퍼
  const renderPillar = (title: string, p: typeof profile.pillars.year) => (
    <div className="flex flex-col items-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</div>
      {/* 천간 */}
      <div className="text-xs text-gray-400 dark:text-gray-500">{p.stemTenStar}</div>
      <div className={`text-2xl font-bold ${ohangColor[p.stemElement]}`}>{p.stemHanzi}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.stem}</div>
      {/* 지지 */}
      <div className={`text-2xl font-bold ${ohangColor[p.branchElement]}`}>{p.branchHanzi}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{p.branch}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{p.branchTenStar}</div>
    </div>
  );
  
  return (
    <div className="w-full text-gray-900 dark:text-white p-4 sm:p-6 max-w-5xl mx-auto transition-colors duration-300">
      <header className="mb-6 sm:mb-8 mt-8 sm:mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">나의 사주 명식</h1>
        <p className="text-gray-500 dark:text-gray-400">오늘의 일진(日辰)과 맞춤형 매칭 데이터를 확인하세요.</p>
      </header>

      {/* 전문 사주 팔자 영역 (명식표) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-xl shadow-md dark:shadow-2xl mb-6 sm:mb-8 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200">명식표 (사주팔자)</h2>
          <span className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 self-stretch sm:self-auto text-center">본질: <span className={ohangColor[profile.dayMaster]}>{profile.pillars.day.stem}{profile.pillars.day.branch} ({profile.dayMaster})</span></span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {renderPillar('생시 (시주)', profile.pillars.hour)}
          {renderPillar('생일 (일주)', profile.pillars.day)}
          {renderPillar('생월 (월주)', profile.pillars.month)}
          {renderPillar('생년 (년주)', profile.pillars.year)}
        </div>
      </div>

      {/* 오행 퍼센트 분석 영역 */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-xl shadow-md dark:shadow-2xl mb-6 sm:mb-8 transition-colors duration-300">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">오행 분석</h2>
        <div className="space-y-4">
          {Object.entries(profile.elementPercentages).map(([ohang, percent]) => (
            <div key={ohang} className="flex items-center text-sm">
              <div className="w-16 flex items-center gap-2">
                <span>{ohangEmoji[ohang]}</span> <span className="text-gray-500 dark:text-gray-400">{ohang}</span>
              </div>
              <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-transparent rounded-full overflow-hidden mx-3">
                <div 
                  className={`h-full ${ohangBgColor[ohang]} transition-all duration-1000`} 
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              <div className="w-12 text-right text-gray-600 dark:text-gray-300 font-mono">{percent.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 여기서 mb-6 sm:mb-8을 주어 "현재 접속 중인 인연" 카드와의 여백을 확보합니다. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-xl shadow-md dark:shadow-lg transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-gray-100">나의 사주 프로필</h2>
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-3xl shadow-inner shrink-0">
              {ohangEmoji[profile.dayMaster]}
            </div>
            <div className="flex-1">
              <p className="text-lg">일주: <span className={`${ohangColor[profile.dayMaster]} font-bold tracking-widest`}>{profile.iljuHanzi}</span> <span className="text-sm text-gray-500 dark:text-gray-400">({profile.ilju})</span></p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-keep leading-tight">"{profile.dayMasterDescription}"</p>
            </div>
          </div>
          
          {/* 음양 및 기운 요약 */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-1 text-xs">음양(陰陽) 밸런스</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                양 <span className="text-red-400">{profile.yinYangCount.yang}</span> : 음 <span className="text-blue-400">{profile.yinYangCount.yin}</span>
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-1 text-xs">나의 주 기운</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {profile.dominantElement} <span className="text-xs text-gray-500 font-normal">({profile.elementPercentages[profile.dominantElement].toFixed(0)}%)</span>
              </p>
            </div>
          </div>

          {/* 신강 신약 그래프 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="relative group cursor-help border-b border-dashed border-gray-300 dark:border-gray-600 pb-0.5">
                신약
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded shadow-xl z-20 font-normal">
                  <b>신약(身弱):</b> 나의 기운이 약한 상태. 유연하고 환경 적응력이 좋으나 타인에게 휩쓸리기 쉽습니다. 나를 도와주는 기운이 올 때 발복합니다.
                </div>
              </span>
              <span className="relative group cursor-help border-b border-dashed border-gray-300 dark:border-gray-600 pb-0.5">
                신강 지수 ({profile.singangScore.toFixed(0)}점)
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-56 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded shadow-xl z-20 text-center font-normal">
                  내 사주의 8글자 중 나(일간)를 도와주는 기운이 얼마나 많은지 나타내는 점수입니다. (45~55점이 중화)
                </div>
              </span>
              <span className="relative group cursor-help border-b border-dashed border-gray-300 dark:border-gray-600 pb-0.5">
                신강
                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded shadow-xl z-20 font-normal text-right">
                  <b>신강(身强):</b> 나의 기운이 강한 상태. 주관과 추진력이 뛰어나지만 고집이 셀 수 있습니다. 나의 기운을 빼주는 요소가 올 때 편안해집니다.
                </div>
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-blue-500 to-red-500" style={{ width: `${profile.singangScore}%` }}></div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center border border-gray-200 dark:border-gray-800">
            <span>✅ 사주 명식 검증 완료</span>
            <span>만세력 API 기반</span>
          </div>
        </div>

        {/* Daily Fortune / Timing */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-xl shadow-md dark:shadow-lg transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-gray-100">오늘의 일진 & 타이밍 (상세)</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
              오늘은 <span className="font-bold text-gray-900 dark:text-white">{profile.iljinCalendar[0].korean}({profile.iljinCalendar[0].hanja})</span>의 날입니다.
              {profile.singangType.includes('약') ? ' 나를 도와주는 인성과 비겁의 기운이 들어오면 좋습니다.' : ' 나의 강한 기운을 설계해줄 식상, 재성, 관성의 기운이 유리합니다.'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800">
              💡 {profile.gender === 'male' ? '남성에게 재성(財星)은 재물과 연인(배우자)을 의미합니다. 오늘 재성의 기운이 있다면 데이트 성공 확률이 높습니다.' : '여성에게 관성(官星)은 직장과 연인(배우자)을 의미합니다. 오늘 관성의 기운이 들어왔다면 매력적인 인연을 만날 수 있습니다.'}
            </p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg mb-4">
            <p className="text-red-500 dark:text-red-400 text-sm font-bold mb-1">🔥 매칭 골든 타임</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">오후 1시~3시(未時)에 운명 스코어가 가장 크게 진동합니다. 이 시간대에 대화를 시작해보세요.</p>
          </div>
          
          {/* 십성 분석 간략히 */}
          <div className="text-xs">
            <p className="text-gray-500 dark:text-gray-400 mb-2">나의 주요 십성 무기 (발달된 기운)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.shipseongPercentages).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([shipseong, percent]) => (
                <span key={shipseong} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">{shipseong} {percent.toFixed(0)}%</span>
              ))}
            </div>
          </div>
        </div>

        {/* Synergy Matches */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-xl shadow-md dark:shadow-lg transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-2 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 text-gray-800 dark:text-gray-100">
            <span>귀인(貴人) 추천</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal sm:pb-0.5">클릭하여 즉시 대화하기</span>
          </h2>
          <ul className="space-y-3">
            {profile.lackingElements.map((ohang, index) => (
              <li 
                key={index} 
                onClick={() => {
                  onSelectMatch(ohang);
                  document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-transparent flex items-center justify-center text-xl">{ohangEmoji[ohang]}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{ohang}의 기운을 가진 분</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">나의 부족한 점을 채워줍니다</p>
                  </div>
                </div>
                <span className="text-green-400 font-bold">{92 + index}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 현재 접속 중인 인연 (테스트 및 빠른 대화용) */}
      {recentUsers && recentUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-xl shadow-md dark:shadow-lg mb-6 sm:mb-8 transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 text-gray-800 dark:text-gray-100">
            <span>🟢 현재 접속 중인 인연</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal sm:pb-0.5">오행이 맞지 않아도 즉시 대화해볼 수 있습니다</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentUsers.map((user, index) => (
              <div 
                key={index}
                onClick={() => {
                  if (onSelectPartner) onSelectPartner(user);
                  document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">{ohangEmoji[user.dominantElement] || '👤'}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.dominantElement}의 기운을 가진 분</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.gender === 'male' ? '남성' : '여성'} / {user.birthYear}년생</p>
                  </div>
                </div>
                <button className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded">대화</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 일진 달력 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-xl shadow-md dark:shadow-lg overflow-x-auto transition-colors duration-300">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2 min-w-[200px] text-gray-800 dark:text-gray-100">
          <span>주간 일진(日辰) 달력</span>
          <div className="relative group cursor-help">
            <span className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs rounded-full w-5 h-5 flex items-center justify-center transition-colors">?</span>
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded shadow-xl z-20 font-normal leading-relaxed">
              <b>일진(日辰)이란?</b><br/>
              매일매일 바뀌는 하루의 기운을 뜻합니다. 위에 표시된 한자와 색상(오행)이 그날 우주가 뿜어내는 주요 기운이며, 이 기운이 나의 사주와 만나 오늘의 컨디션과 운세를 결정합니다.
            </div>
          </div>
        </h2>
      <div className="flex space-x-3 sm:space-x-4 min-w-max pb-2">
          {profile.iljinCalendar.map((day, idx) => (
            <div key={idx} className={`flex flex-col items-center p-2 sm:p-3 rounded border w-20 sm:w-24 text-center shrink-0 ${idx === 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 shadow-sm' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{idx === 0 ? '오늘' : day.date}</span>
              <span className={`text-xl font-bold mb-1 ${ohangColor[day.element]}`}>{day.hanja}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{day.korean}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};