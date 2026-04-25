import React, { useEffect, useState } from 'react';
import { Dashboard } from './Dashboard';
import { Chat } from './Chat';
import { fetchActualOhangBalance, calculateOhangBalance, SajuProfile } from './sajuEngine';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, deleteDoc, updateDoc, where, getDocs } from 'firebase/firestore';

export const App: React.FC = () => {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [myProfile, setMyProfile] = useState<SajuProfile | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // 초기화 상태 추가
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
  const [activeMatchOhang, setActiveMatchOhang] = useState<string | null>(null);
  const [activeTargetPartner, setActiveTargetPartner] = useState<any | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 앱 초기화 시 로그인 상태 및 프로필 자동 복구
  useEffect(() => {
    // 1. 로컬 스토리지에서 즉시 복구 (화면 깜빡임 없이 즉시 대시보드 패스)
    const savedData = localStorage.getItem('sajuSyncData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setBirthDate(data.birthDate);
        setBirthTime(data.birthTime);
        setGender(data.gender);
        
        const dateTimeString = `${data.birthDate}T${data.birthTime || '00:00'}:00`;
        const profile = calculateOhangBalance(new Date(dateTimeString), data.gender);
        setMyProfile(profile);
      } catch (e) {
        console.error("로컬 스토리지 복구 실패:", e);
      }
    }
    setIsInitializing(false);

    // 2. Firebase Auth 상태 연동
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUid(user.uid);
        localStorage.setItem('sajuSyncUid', user.uid); // 현재 접속 중인 UID 기억하기
        await setDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  // 다크모드 <html class="dark"> 제어
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 1분마다 접속 상태(lastActive) 갱신 (Heartbeat 로직)
  useEffect(() => {
    if (!currentUid || !myProfile) return;
    const interval = setInterval(() => {
      updateDoc(doc(db, 'users', currentUid), { lastActive: serverTimestamp() }).catch(e => console.log("접속 갱신 실패:", e));
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUid, myProfile]);

  // 유저 정보와 관련된 모든 채팅방 내역을 완전히 삭제하는 헬퍼 함수
  const deleteUserAndChats = async (uidToDelete: string) => {
    try {
      // 1. 내가 참여 중인 모든 채팅방 조회
      const roomsRef = collection(db, 'chatRooms');
      const q = query(roomsRef, where('participants', 'array-contains', uidToDelete));
      const qSnapshot = await getDocs(q);
      
      for (const roomDoc of qSnapshot.docs) {
        // 채팅방 내부의 메시지들을 모두 삭제
        const messagesRef = collection(db, 'chatRooms', roomDoc.id, 'messages');
        const msgsSnapshot = await getDocs(messagesRef);
        const deletePromises = msgsSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        // 채팅방 문서 자체 삭제
        await deleteDoc(roomDoc.ref);
      }
      // 2. 유저 정보 삭제
      await deleteDoc(doc(db, 'users', uidToDelete));
    } catch (e) {
      console.error("유저 및 채팅방 완전 삭제 실패:", e);
    }
  };

  // 접속 중인 다른 유저 목록 가져오기 (테스트 및 빠른 매칭용)
  useEffect(() => {
    if (!currentUid) return;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('lastActive', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const users = snapshot.docs.map(d => d.data()).filter(u => {
        if (u.uid === currentUid) return false;
        // 3분(180,000ms) 이내 활동이 없는 유저는 브라우저를 닫은 것으로 간주하여 목록에서 완전 제외
        const lastActiveMillis = u.lastActive?.toMillis() || 0;
        return (now - lastActiveMillis) < 180000;
      });
      setRecentUsers(users.slice(0, 10)); // 최대 10명만 표시
    });
    return () => unsubscribe();
  }, [currentUid]);

  // 생년월일을 바탕으로 사주 분석 시작
  const handleStartAnalysis = async () => {
    if (!birthDate) return alert('생년월일을 입력해주세요.');
    
    setIsLoading(true);
    try {
      // 날짜와 시간을 결합 (시간을 입력하지 않으면 기본값으로 자정 처리)
      const dateTimeString = `${birthDate}T${birthTime || '00:00'}:00`;
      
      // 비동기(API 연동) 함수 호출
      const analyzedProfile = await fetchActualOhangBalance(new Date(dateTimeString), gender);
      setMyProfile(analyzedProfile);
      
      // 브라우저 로컬 스토리지에 저장 (다음 접속 시 즉시 패스용)
      localStorage.setItem('sajuSyncData', JSON.stringify({
        birthDate,
        birthTime,
        gender
      }));

      // 1. Firebase 익명 로그인
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      setCurrentUid(uid);

      // 같은 브라우저에서 이전에 사용하던 UID가 남아있다면 DB에서 완전히 삭제 (유령 계정 방지)
      const prevUid = localStorage.getItem('sajuSyncUid');
      if (prevUid && prevUid !== uid) {
        await deleteUserAndChats(prevUid);
      }
      localStorage.setItem('sajuSyncUid', uid);

      // 2. Firestore 'users' 컬렉션에 나의 사주 정보 등록 (매칭용)
      await setDoc(doc(db, 'users', uid), {
        uid,
        gender,
        birthDateString: birthDate,
        birthTimeString: birthTime,
        birthYear: new Date(birthDate).getFullYear(),
        dayMaster: analyzedProfile.dayMaster,
        dominantElement: analyzedProfile.dominantElement, // 나의 주 기운
        lastActive: serverTimestamp()
      }, { merge: true });
    } catch (error: any) {
      console.error("사주 분석/로그인 에러:", error);
      alert(`오류가 발생했습니다.\n원인: ${error.message || '알 수 없는 오류'}\n(시크릿 모드일 경우 타사 쿠키 차단을 해제해주세요)`);
    } finally {
      setIsLoading(false);
    }
  };

  // 프로필 초기화 (로그아웃 및 데이터 완전 삭제)
  const handleLogout = async () => {
    if (window.confirm("프로필을 초기화하시겠습니까?\n현재 접속 중인 인연 목록에서 완전히 삭제되며 처음부터 다시 시작합니다.")) {
      if (currentUid) {
        await deleteUserAndChats(currentUid);
      }
      await signOut(auth);
      localStorage.removeItem('sajuSyncData');
      localStorage.removeItem('sajuSyncUid');
      setMyProfile(null);
      setCurrentUid(null);
      setActiveMatchOhang(null);
      setActiveTargetPartner(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[100dvh] flex flex-col items-center justify-center font-sans p-4 text-gray-900 dark:text-white transition-colors duration-300">
        <div className="animate-spin text-4xl mb-4">🔮</div>
        <p>운명의 기록을 불러오는 중입니다...</p>
      </div>
    );
  }

  // 사주 프로필이 없다면 정보 입력 화면(Onboarding)을 보여줌
  if (!myProfile) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[100dvh] flex items-center justify-center font-sans p-5 sm:p-6 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg dark:shadow-2xl max-w-md w-full transition-colors duration-300">
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">사주 🔮 싱크</h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">생년월일을 입력하고 나의 천생연분을 찾아보세요.</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">성별</label>
            <div className="flex gap-4">
              <button 
                onClick={() => setGender('male')}
                className={`flex-1 py-3 rounded-lg border font-bold transition-all ${gender === 'male' ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                남성
              </button>
              <button 
                onClick={() => setGender('female')}
                className={`flex-1 py-3 rounded-lg border font-bold transition-all ${gender === 'female' ? 'bg-red-500 border-red-400 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                여성
              </button>
            </div>
          </div>

          {/* 생년월일 & 태어난 시간 가로 배치 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">생년월일</label>
              <input 
                type="date" 
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg px-3 sm:px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">태어난 시간 <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(선택)</span></label>
              <input 
                type="time" 
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg px-3 sm:px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm sm:text-base"
              />
            </div>
          </div>

          <button 
            onClick={handleStartAnalysis}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            {isLoading ? '우주의 기운을 모아 분석 중... 🔮' : '나의 오행 분석하고 매칭 시작하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-[100dvh] font-sans transition-colors duration-300 relative">
      {/* 우측 상단 컨트롤 패널 */}
      <div className="absolute top-safe pt-4 right-4 sm:right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-lg"
          title="테마 전환"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button 
          onClick={handleLogout} 
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-b border-gray-400 dark:border-gray-600 pb-0.5 transition-colors bg-white/80 dark:bg-gray-950/80 px-2 py-1 rounded shadow-sm"
        >
          프로필 초기화 (로그아웃)
        </button>
      </div>

      {/* 상단 대시보드 */}
      <Dashboard 
        profile={myProfile} 
        onSelectMatch={(ohang) => { setActiveMatchOhang(ohang); setActiveTargetPartner(null); }} 
        recentUsers={recentUsers}
        onSelectPartner={(partner) => { setActiveTargetPartner(partner); setActiveMatchOhang(null); }}
      />
      
      {/* 하단 채팅 영역 */}
      <div className="p-4 sm:p-6 pb-12" id="chat-section">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center">💖 운명의 상대와 대화하기</h2>
        <Chat 
          targetMatchOhang={activeMatchOhang} 
          targetPartner={activeTargetPartner}
          currentUid={currentUid} 
          myProfile={myProfile} 
          onClearMatch={() => { setActiveMatchOhang(null); setActiveTargetPartner(null); }} 
        />
      </div>
    </div>
  );
};

export default App;