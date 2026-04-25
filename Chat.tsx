import React, { useState, useEffect, useRef } from 'react';
import { getDateRecommendation, calculateSynergyScore, SajuProfile } from './sajuEngine';
import { db } from './firebase';
import { collection, query, where, getDocs, limit, doc, onSnapshot, addDoc, serverTimestamp, orderBy, QueryConstraint, setDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';

interface ChatProps {
  targetMatchOhang: string | null;
  targetPartner?: any | null; // 특정 유저와 즉시 매칭
  currentUid: string | null;
  myProfile: SajuProfile | null;
  onClearMatch: () => void;
}

export const Chat: React.FC<ChatProps> = ({ targetMatchOhang, targetPartner, currentUid, myProfile, onClearMatch }) => {
  const ohangEmoji: Record<string, string> = { '木': '🌳', '火': '🔥', '土': '⛰️', '金': '⚔️', '水': '🌊' };
  
  const [isSearching, setIsSearching] = useState(false);
  const [activePartner, setActivePartner] = useState<any | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstSnapshot = useRef(true); // 처음 데이터 로딩 시 알림음 방지용
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [targetGender, setTargetGender] = useState<'any' | 'male' | 'female'>('any');
  const [targetAgeGroup, setTargetAgeGroup] = useState<'any' | '20' | '30' | '40' | '50'>('any');

  // 동적 운명 스코어 계산 (나의 사주와 상대방의 사주를 비교)
  const synergyScore = (myProfile && activePartner) 
    ? calculateSynergyScore(myProfile, { 
        dominantElement: activePartner.dominantElement, 
        dayMaster: activePartner.dayMaster || activePartner.dominantElement, // 이전 데이터 호환성 유지
        lackingElements: [] 
      } as any) 
    : 50;

  // 1. 내 채팅방 목록 가져오기
  useEffect(() => {
    if (!currentUid) return;
    const roomsRef = collection(db, 'chatRooms');
    // 내가 속한(participants 배열에 내 UID가 있는) 채팅방만 가져옵니다.
    const q = query(roomsRef, where('participants', 'array-contains', currentUid), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 카카오톡 스타일 정렬: 안 읽은 메시지가 있는 방을 최상단으로 끌어올림
      fetchedRooms.sort((a: any, b: any) => {
        const aUnread = (a.unreadCount?.[currentUid] || 0) > 0 ? 1 : 0;
        const bUnread = (b.unreadCount?.[currentUid] || 0) > 0 ? 1 : 0;
        
        // 1. 안 읽은 방(1)이 읽은 방(0)보다 무조건 위로 오게 함
        if (aUnread !== bUnread) {
          return bUnread - aUnread; 
        }
        
        // 2. 둘 다 안 읽었거나 둘 다 읽었으면 최신 메시지 시간순으로 정렬
        const aTime = a.lastMessageAt?.toMillis() || 0;
        const bTime = b.lastMessageAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setChatRooms(fetchedRooms);
    }, (error) => console.log("채팅 목록 대기 중... (처음엔 인덱스 생성이 필요할 수 있습니다)"));
    return () => unsubscribe();
  }, [currentUid]);

  // 2. 상대방 탐색 로직 (새로운 귀인 매칭 또는 특정 접속자 선택)
  useEffect(() => {
    // 특정 파트너가 지정된 경우 즉시 연결
    if (targetPartner && currentUid && myProfile) {
      setIsSearching(true);
      const connectDirectly = async () => {
        const generatedRoomId = [currentUid, targetPartner.uid].sort().join('_');
        
        await setDoc(doc(db, 'chatRooms', generatedRoomId), {
          participants: [currentUid, targetPartner.uid],
          users: {
            [currentUid]: { element: myProfile.dominantElement, gender: myProfile.gender, dayMaster: myProfile.dayMaster },
            [targetPartner.uid]: { element: targetPartner.dominantElement, gender: targetPartner.gender, dayMaster: targetPartner.dayMaster }
          },
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp() // 방이 생성되자마자 목록에 나타나도록 시간 초기화
        }, { merge: true });

        setActivePartner(targetPartner);
        setActiveRoomId(generatedRoomId);
        setIsSearching(false);
      };
      connectDirectly();
      return;
    }

    // 오행(targetMatchOhang)으로 검색하는 경우
    if (!targetMatchOhang || !currentUid || !myProfile) return;
    
    const findMatch = async () => {
      setIsSearching(true);
      setActivePartner(null);
      setActiveRoomId(null);

      try {
        const constraints: QueryConstraint[] = [
          where('dominantElement', '==', targetMatchOhang)
        ];

        if (targetGender !== 'any') {
          constraints.push(where('gender', '==', targetGender));
        }

        if (targetAgeGroup !== 'any') {
          const currentYear = new Date().getFullYear();
          const ageGroup = parseInt(targetAgeGroup, 10);
          const minYear = ageGroup === 50 ? 1900 : currentYear - ageGroup - 9;
          const maxYear = currentYear - ageGroup;
          constraints.push(where('birthYear', '>=', minYear));
          constraints.push(where('birthYear', '<=', maxYear));
        }

        constraints.push(limit(10)); // 클라이언트 필터링(본인 제외)을 위해 여유있게 검색

        const usersRef = collection(db, 'users');
        const q = query(usersRef, ...constraints);
        const querySnapshot = await getDocs(q);

        let partner = null;
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          if (data.uid !== currentUid) { // 나 자신과 매칭되는 것 방지
            partner = data;
            break;
          }
        }

        if (partner) {
          const generatedRoomId = [currentUid, partner.uid].sort().join('_');
          
          // 채팅방 메타데이터 저장 (방이 이미 존재하면 합치고, 없으면 생성)
          await setDoc(doc(db, 'chatRooms', generatedRoomId), {
            participants: [currentUid, partner.uid],
            users: {
              [currentUid]: { element: myProfile.dominantElement, gender: myProfile.gender, dayMaster: myProfile.dayMaster },
              [partner.uid]: { element: partner.dominantElement, gender: partner.gender, dayMaster: partner.dayMaster }
            },
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp() // 방이 생성되자마자 목록에 나타나도록 시간 초기화
          }, { merge: true });

          setActivePartner(partner);
          setActiveRoomId(generatedRoomId);
        }
      } catch (error) {
        console.error("매칭 검색 에러 (복합 인덱스 설정이 필요할 수 있습니다):", error);
      } finally {
        setIsSearching(false);
      }
    };
    findMatch();
  }, [targetMatchOhang, targetPartner, currentUid, targetGender, targetAgeGroup, myProfile]);

  // 3. 활성화된 채팅방의 실시간 메시지 불러오기
  useEffect(() => {
    if (!activeRoomId || !currentUid) return;
    
    isFirstSnapshot.current = true; // 방이 바뀔 때마다 초기화
    
    const messagesRef = collection(db, 'chatRooms', activeRoomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 내가 읽지 않은 상대방의 메시지를 찾아 읽음(isRead: true) 처리합니다.
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          if (data.senderId !== currentUid && data.isRead === false) {
            updateDoc(doc(db, 'chatRooms', activeRoomId, 'messages', change.doc.id), {
              isRead: true
            });
          }
        }
      });

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      isFirstSnapshot.current = false;
    });
    return () => unsubscribe();
  }, [activeRoomId, currentUid]);

  // 입력 중(Typing) 상태 감지 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMsg(e.target.value);
    if (!activeRoomId || !currentUid) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!isTyping) {
      setIsTyping(true);
      updateDoc(doc(db, 'chatRooms', activeRoomId), { [`typing.${currentUid}`]: true });
    }

    // 1.5초 동안 추가 입력이 없으면 입력 중지 상태로 변경
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateDoc(doc(db, 'chatRooms', activeRoomId), { [`typing.${currentUid}`]: false });
    }, 1500);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMsg.trim() || !activeRoomId || !currentUid) return;
    
    const msgText = inputMsg;
    setInputMsg(''); // 빠른 UI 반응을 위해 입력창 즉시 초기화
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);

    await addDoc(collection(db, 'chatRooms', activeRoomId, 'messages'), {
      text: msgText,
      senderId: currentUid,
      createdAt: serverTimestamp(),
      isRead: false // 전송 시 읽지 않음 상태로 저장
    });

    // 상대방 UID 추출
    const pId = activeRoomId.split('_').find(id => id !== currentUid);

    // 채팅방 목록 갱신을 위해 마지막 메시지와 시간을 업데이트
    await updateDoc(doc(db, 'chatRooms', activeRoomId), {
      lastMessage: msgText,
      lastMessageAt: serverTimestamp(),
      ...(pId ? { [`unreadCount.${pId}`]: increment(1) } : {}), // 상대방의 안읽음 뱃지 카운트 1 증가
      [`typing.${currentUid}`]: false // 전송 완료 시 입력 중 상태 해제
    });
  };

  // 채팅방 나가기 핸들러
  const handleLeaveRoom = async () => {
    if (!activeRoomId || !currentUid) return;
    if (window.confirm("정말 이 대화방을 나가시겠습니까?\n대화 내역이 양쪽 모두의 목록에서 영구적으로 삭제됩니다.")) {
      
      // 1. 하위 컬렉션(messages)의 모든 메시지를 가져와서 삭제합니다. (서버 데이터 완전 삭제)
      const messagesRef = collection(db, 'chatRooms', activeRoomId, 'messages');
      const qSnapshot = await getDocs(messagesRef);
      const deletePromises = qSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. 채팅방 문서 자체를 삭제합니다.
      await deleteDoc(doc(db, 'chatRooms', activeRoomId));

      setActiveRoomId(null);
      onClearMatch();
    }
  };

  // 상대방이 방을 나가서 방이 폭파되었는지 실시간 감지 (자동 나가기)
  useEffect(() => {
    if (!activeRoomId || !currentUid) return;
    
    const roomRef = doc(db, 'chatRooms', activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      // 채팅방 문서가 삭제되었거나(docSnap.exists === false), 내가 참여자 목록에 없는 경우 자동 퇴장
      if (!docSnap.exists()) {
        alert("상대방이 대화방을 나갔습니다.\n채팅방이 자동으로 정리됩니다.");
        setActiveRoomId(null);
        onClearMatch();
      } else {
        const data = docSnap.data();
        if (data.participants && !data.participants.includes(currentUid)) {
          alert("상대방이 대화방을 나갔습니다.\n채팅방이 자동으로 정리됩니다.");
          setActiveRoomId(null);
          onClearMatch();
        }
      }
    });
    return () => unsubscribe();
  }, [activeRoomId, currentUid, onClearMatch]);

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px] w-full max-w-md mx-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 매칭 필터 UI (새로운 상대를 찾을 때만 표시) */}
      {!activeRoomId && targetMatchOhang && (
        <div className="bg-gray-50 dark:bg-gray-950 p-3 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-2 justify-between sm:items-center text-xs">
          <div className="flex gap-2">
            <select value={targetGender} onChange={e => setTargetGender(e.target.value as any)} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none">
              <option value="any">성별 무관</option>
              <option value="female">여성</option>
              <option value="male">남성</option>
            </select>
            <select value={targetAgeGroup} onChange={e => setTargetAgeGroup(e.target.value as any)} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none">
              <option value="any">나이 무관</option>
              <option value="20">20대</option>
              <option value="30">30대</option>
              <option value="40">40대</option>
              <option value="50">50대 이상</option>
            </select>
          </div>
          <span className="text-gray-500 dark:text-gray-400 self-end sm:self-auto">필터 변경 시 자동 검색</span>
        </div>
      )}

      {/* 채팅방 목록 헤더 */}
      {!activeRoomId && !targetMatchOhang && !targetPartner && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-white font-bold">💬 내 채팅방 목록</h3>
        </div>
      )}

      {/* 상태별 화면 처리 (조건부 렌더링) */}
      {isSearching ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-6 text-center">
          <div className="animate-spin text-4xl mb-4">🔮</div>
          <p>{targetPartner ? '상대방과 연결 중입니다...' : `조건에 맞는 ${targetMatchOhang}의 기운을 가진 운명의 상대를 찾고 있습니다...`}</p>
        </div>
      ) : targetMatchOhang && !activeRoomId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
          <p>조건에 맞는 <b>{targetMatchOhang}의 기운</b> 접속자가 없습니다 😢</p>
          <p className="text-sm mt-2">필터 조건을 변경하거나 다른 기운을 찾아보세요.</p>
        </div>
      ) : activeRoomId ? (
        <>
      {/* Chat Header */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveRoomId(null); onClearMatch(); }} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-1 sm:px-2 py-1 transition-colors text-lg">⬅️</button>
          <div className="w-10 h-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-transparent rounded-full flex items-center justify-center text-xl">{ohangEmoji[activePartner?.dominantElement || '木']}</div>
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-sm sm:text-base">{activePartner?.dominantElement}의 기운을 가진 분</h3>
            {myProfile?.lackingElements.includes(activePartner?.dominantElement) ? (
              <p className="text-xs text-blue-400">나에게 필요한 기운 1순위</p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">새롭게 이어진 인연</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="text-2xl font-bold text-green-400">{synergyScore}%</span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">운명 스코어</p>
          </div>
          <button 
            onClick={handleLeaveRoom}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
            title="채팅방 나가기"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Ice Breaking / Conversation Starter */}
      {synergyScore > 80 && (
        <div className="bg-blue-50 dark:bg-blue-900/40 p-3 text-sm text-blue-800 dark:text-blue-200 border-b border-blue-200 dark:border-blue-800 text-center">
          💡 <b>추천 데이트:</b> {getDateRecommendation(activePartner?.dominantElement as any || '水')}
          <br/> "혹시 한강 피크닉 좋아하시나요?" 라고 물어보세요!
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-100 dark:bg-gray-950">
        {messages.map((msg) => {
          // 시스템 메시지(입장/퇴장) 렌더링
          if (msg.isSystem && msg.type === 'leave') {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 shadow-sm">
                  {msg.senderId === currentUid ? '내가 대화방을 나갔습니다.' : '상대방이 대화방을 나갔습니다.'}
                </span>
              </div>
            );
          }

          const isMe = msg.senderId === currentUid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end`}>
              {/* 내가 보낸 메시지이고 아직 안 읽었을 때 숫자 1 표시 */}
              {isMe && msg.isRead === false && (
                <span className="text-yellow-400 text-xs font-bold mr-2 mb-1">1</span>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 text-sm break-words ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        
        {/* 상대방 입력 중 표시 애니메이션 */}
        {activePartner && chatRooms.find(r => r.id === activeRoomId)?.typing?.[activePartner.uid] && (
          <div className="flex justify-start items-end mt-2 animate-pulse">
            <div className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl px-4 py-2 text-xs rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm">
              상대방이 입력 중입니다... 💬
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={inputMsg}
          onChange={handleInputChange}
          className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 sm:px-4 py-2.5 rounded-lg border border-gray-300 dark:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base"
          placeholder="운명의 상대에게 메시지 보내기..."
        />
        <button 
          type="submit"
          disabled={!inputMsg.trim()}
          className="bg-blue-600 px-4 sm:px-5 py-2.5 rounded-lg text-white font-bold disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:text-gray-200 dark:disabled:text-gray-400 transition-colors text-sm sm:text-base shrink-0"
        >
          전송
        </button>
      </form>
      </>
      ) : (
        /* 채팅방 목록 UI */
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-2">
          {chatRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm p-6 text-center">
              <p>아직 진행 중인 대화가 없습니다.</p>
              <p className="mt-2 text-xs">대시보드의 '귀인 추천 목록'에서<br/>대화하고 싶은 상대를 클릭해 매칭을 시작해보세요!</p>
            </div>
          ) : (
            chatRooms.map(room => {
              const pId = room.participants?.find((id: string) => id !== currentUid);
              const pInfo = room.users?.[pId];
              if (!pInfo) return null;

              // 내 UID 기준 안 읽은 메시지 개수
              const unreadCount = currentUid ? (room.unreadCount?.[currentUid] || 0) : 0;

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    setActivePartner({ uid: pId, dominantElement: pInfo.element, gender: pInfo.gender, dayMaster: pInfo.dayMaster });
                    setActiveRoomId(room.id);
                    onClearMatch(); // 목록에서 클릭 시 상단 매칭 상태 해제
                    
                    // 방에 들어갈 때 내 뱃지 즉시 0으로 초기화
                    if (unreadCount > 0 && currentUid) {
                      updateDoc(doc(db, 'chatRooms', room.id), {
                        [`unreadCount.${currentUid}`]: 0
                      });
                    }
                  }}
                  className="flex items-center p-3 mb-2 bg-white dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-transparent rounded-full flex items-center justify-center text-2xl mr-4">{ohangEmoji[pInfo.element] || '👤'}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 dark:text-gray-200 font-bold text-sm truncate">{pInfo.element}의 기운을 가진 분</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-1">{room.lastMessage || '새로운 대화가 시작되었습니다.'}</p>
                  </div>
                  <div className="flex flex-col items-end ml-2 gap-1">
                    {room.lastMessageAt && (
                      <div className="text-[10px] text-gray-500 whitespace-nowrap">{room.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    )}
                    {unreadCount > 0 && (
                      <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};