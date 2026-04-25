import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SajuProfile } from './sajuEngine';

// 1. 사용자 사주 프로필 DB에 저장하기
export const saveUserProfile = async (userId: string, profile: SajuProfile) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...profile,
    updatedAt: new Date(),
  }, { merge: true }); // 기존 데이터에 병합
  console.log('프로필 저장 완료!');
};

// 2. 사용자 사주 프로필 DB에서 불러오기
export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as SajuProfile;
  }
  return null;
};