import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Memo,
  Participant,
  PracticeRecord,
  ProcessDef,
  YearDoc,
  InProgressRecord,
  DEFAULT_PROCESSES,
  sumProcessSeconds,
} from "./types";

const SETTINGS_DOC = doc(db, "meta", "settings");

// ---------- 年度 ----------

export async function listYears(): Promise<YearDoc[]> {
  const snap = await getDocs(
    query(collection(db, "years"), orderBy("label", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getYear(yearId: string): Promise<YearDoc | null> {
  const snap = await getDoc(doc(db, "years", yearId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export async function createYear(
  label: string,
  processes: ProcessDef[] = DEFAULT_PROCESSES
): Promise<string> {
  const ref = await addDoc(collection(db, "years"), {
    label,
    processes,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateYearProcesses(
  yearId: string,
  processes: ProcessDef[]
): Promise<void> {
  await updateDoc(doc(db, "years", yearId), { processes });
}

// 年度を、配下の選手・記録・メモごとすべて削除する
export async function deleteYear(yearId: string): Promise<void> {
  const participants = await listParticipants(yearId);
  for (const p of participants) {
    const [records, memos] = await Promise.all([
      getDocs(recordsCol(yearId, p.id)),
      getDocs(memosCol(yearId, p.id)),
    ]);
    for (const r of records.docs) {
      await deleteDoc(r.ref);
    }
    for (const m of memos.docs) {
      await deleteDoc(m.ref);
    }
    await deleteDoc(doc(db, "years", yearId, "participants", p.id));
  }
  await deleteDoc(doc(db, "years", yearId));
}

export async function getCurrentYearId(): Promise<string | null> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) return null;
  return (snap.data() as any).currentYearId ?? null;
}

export async function setCurrentYearId(yearId: string): Promise<void> {
  await setDoc(SETTINGS_DOC, { currentYearId: yearId }, { merge: true });
}

// ---------- 選手 ----------

export function participantsCol(yearId: string) {
  return collection(db, "years", yearId, "participants");
}

export async function listParticipants(yearId: string): Promise<Participant[]> {
  const snap = await getDocs(query(participantsCol(yearId), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getParticipant(
  yearId: string,
  participantId: string
): Promise<Participant | null> {
  const snap = await getDoc(doc(db, "years", yearId, "participants", participantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export async function addParticipant(
  yearId: string,
  name: string,
  order: number
): Promise<string> {
  const ref = await addDoc(participantsCol(yearId), {
    name,
    order,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateParticipant(
  yearId: string,
  participantId: string,
  data: Partial<Pick<Participant, "name" | "order">>
): Promise<void> {
  await updateDoc(doc(db, "years", yearId, "participants", participantId), data);
}

export async function deleteParticipant(
  yearId: string,
  participantId: string
): Promise<void> {
  await deleteDoc(doc(db, "years", yearId, "participants", participantId));
}

// 別の年度から選手一覧をコピーする(記録・メモはコピーしない、名簿のみ)
export async function copyParticipantsFromYear(
  fromYearId: string,
  toYearId: string
): Promise<number> {
  const source = await listParticipants(fromYearId);
  for (const p of source) {
    await addParticipant(toYearId, p.name, p.order);
  }
  return source.length;
}

// ---------- 記録(本番形式:1日目/2日目) ----------

export function recordsCol(yearId: string, participantId: string) {
  return collection(db, "years", yearId, "participants", participantId, "records");
}

export async function listRecords(
  yearId: string,
  participantId: string
): Promise<PracticeRecord[]> {
  const snap = await getDocs(
    query(recordsCol(yearId, participantId), orderBy("date", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addRecord(
  yearId: string,
  participantId: string,
  data: Omit<PracticeRecord, "id" | "totalSeconds" | "createdAt">
): Promise<string> {
  const totalSeconds = sumProcessSeconds(data.processes);
  const ref = await addDoc(recordsCol(yearId, participantId), {
    ...data,
    totalSeconds,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateRecord(
  yearId: string,
  participantId: string,
  recordId: string,
  data: Partial<Omit<PracticeRecord, "id" | "createdAt">>
): Promise<void> {
  const patch: any = { ...data };
  if (data.processes) {
    patch.totalSeconds = sumProcessSeconds(data.processes);
  }
  await updateDoc(
    doc(db, "years", yearId, "participants", participantId, "records", recordId),
    patch
  );
}

export async function deleteRecord(
  yearId: string,
  participantId: string,
  recordId: string
): Promise<void> {
  await deleteDoc(
    doc(db, "years", yearId, "participants", participantId, "records", recordId)
  );
}

// ---------- 進行中の記録(1日目の途中から2日目に続きを計測) ----------

function inProgressDoc(yearId: string, participantId: string) {
  return doc(
    db,
    "years",
    yearId,
    "participants",
    participantId,
    "records",
    "_inprogress"
  );
}

export async function getInProgressRecord(
  yearId: string,
  participantId: string
): Promise<InProgressRecord | null> {
  const snap = await getDoc(inProgressDoc(yearId, participantId));
  if (!snap.exists()) return null;
  return snap.data() as InProgressRecord;
}

export async function saveInProgressRecord(
  yearId: string,
  participantId: string,
  data: Omit<InProgressRecord, "updatedAt">
): Promise<void> {
  await setDoc(inProgressDoc(yearId, participantId), {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function clearInProgressRecord(
  yearId: string,
  participantId: string
): Promise<void> {
  await deleteDoc(inProgressDoc(yearId, participantId));
}

// ---------- メモ(良い点・気づき) ----------

export function memosCol(yearId: string, participantId: string) {
  return collection(db, "years", yearId, "participants", participantId, "memos");
}

export async function listMemos(
  yearId: string,
  participantId: string
): Promise<Memo[]> {
  const snap = await getDocs(
    query(memosCol(yearId, participantId), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addMemo(
  yearId: string,
  participantId: string,
  date: string,
  text: string
): Promise<string> {
  const ref = await addDoc(memosCol(yearId, participantId), {
    date,
    text,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deleteMemo(
  yearId: string,
  participantId: string,
  memoId: string
): Promise<void> {
  await deleteDoc(
    doc(db, "years", yearId, "participants", participantId, "memos", memoId)
  );
}
