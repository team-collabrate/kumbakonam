import type { FirestoreError } from "firebase/firestore";

/** Maps a Firestore subscription error to a short, staff-friendly message. */
export function describeFirestoreError(error: FirestoreError): string {
  switch (error.code) {
    case "permission-denied":
      return "You don't have access to this data. Try logging out and back in.";
    case "unavailable":
      return "Can't reach the server. Check your connection.";
    default:
      return "Something went wrong loading this data.";
  }
}
