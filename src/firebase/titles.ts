import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

// A pure UI pointer — same "doesn't reserve or move anything" posture as
// firebase/consumables.ts's setEquippedConsumable, which this mirrors.
// Titles are cosmetic only (see types/character.ts's equippedTitleId doc
// comment); the caller is responsible for only ever passing an id already
// present in the character's unlockedTitleIds (see gameData/titles.ts).
export async function setEquippedTitle(uid: string, titleId: string | null): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), { equippedTitleId: titleId });
}
