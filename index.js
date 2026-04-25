const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 프론트엔드에서 사주 분석 요청이 왔을 때 처리하는 API 엔드포인트
exports.getSajuProfile = functions.https.onCall(async (data, context) => {
  const targetDate = data.date;
  
  // TODO: 여기서 공공데이터포털 만세력 API 혹은 상용 API를 호출합니다.
  // const apiKey = process.env.MANSEORYEOK_API_KEY; // 환경변수에서 키 가져오기
  // const response = await axios.get(`https://api.manseoryeok.com/...`);
  // const parsedData = ... (응답 데이터를 오행 분석 로직으로 변환)

  console.log("요청받은 날짜:", targetDate);

  // 변환된 데이터를 프론트엔드(React)로 반환합니다.
  return {
    dayMaster: '水',
    lackingElements: ['火', '木'],
    dominantElement: '水'
  };
});

// 매일 한국 시간 자정(00:00)에 실행되는 스케줄러
exports.updateDailyMatchScores = functions.pubsub.schedule("0 0 * * *")
  .timeZone("Asia/Seoul")
  .onRun(async (_context) => {
    console.log("일간 매칭 스코어 재계산 배치를 시작합니다.");
    const db = admin.firestore();
    
    // 1. 오늘의 일진 정보 가져오기 (예: 오늘이 火의 날이라면)
    const todayEnergy = '火'; 

    // 2. 전체 유저 목록 가져오기 (실제 서비스에서는 최적화를 위해 Chunk 처리 필요)
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const userData = doc.data();
      // 오늘의 기운이 유저에게 필요한 기운이라면 부스트 점수 부여
      let dailyBoost = 0;
      if (userData.lackingElements && userData.lackingElements.includes(todayEnergy)) {
        dailyBoost = +10; // 오늘 행운의 수치
      }

      // 점수 업데이트
      batch.update(doc.ref, { 
        currentDailyBoost: dailyBoost,
        lastCalculated: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // DB에 일괄 반영
    await batch.commit();
    console.log("매칭 스코어 업데이트 완료");
    return null;
  });