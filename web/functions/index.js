const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function bumpCounterWithFloor(ref, field, delta) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = Number(snap.get(field) || 0);
    const next = Math.max(0, current + delta);
    tx.update(ref, { [field]: next });
  });
}

exports.onShowcaseLiked = functions.firestore
  .document("users/{userId}/likedShowcases/{showcaseId}")
  .onCreate(async (_snap, context) => {
  const showcaseId = context.params.showcaseId;
  if (!showcaseId) return;
  const showcaseRef = db.collection("showcases").doc(showcaseId);
  await bumpCounterWithFloor(showcaseRef, "likesCount", 1);
});

exports.onShowcaseUnliked = functions.firestore
  .document("users/{userId}/likedShowcases/{showcaseId}")
  .onDelete(async (_snap, context) => {
  const showcaseId = context.params.showcaseId;
  if (!showcaseId) return;
  const showcaseRef = db.collection("showcases").doc(showcaseId);
  await bumpCounterWithFloor(showcaseRef, "likesCount", -1);
});

exports.onJobLiked = functions.firestore
  .document("users/{userId}/likedJobTiles/{jobId}")
  .onCreate(async (_snap, context) => {
  const jobId = context.params.jobId;
  if (!jobId) return;
  const jobRef = db.collection("jobs").doc(jobId);
  await bumpCounterWithFloor(jobRef, "likesCount", 1);
});

exports.onJobUnliked = functions.firestore
  .document("users/{userId}/likedJobTiles/{jobId}")
  .onDelete(async (_snap, context) => {
  const jobId = context.params.jobId;
  if (!jobId) return;
  const jobRef = db.collection("jobs").doc(jobId);
  await bumpCounterWithFloor(jobRef, "likesCount", -1);
});
