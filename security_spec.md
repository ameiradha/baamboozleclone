# Security Specification - QuizBattle Classroom

## 1. Data Invariants
- Teachers can create, read, update, and delete their own games.
- Public games can be read by anyone (authenticated or anonymous students/teachers) to browse, duplicate, or host.
- Game questions belong to a game and share the same access rules as the parent game.
- GameSessions can be created by authenticated teachers (the host).
- Students (including anonymous / guest users) can read the session data using the PIN, join as players, submit answers, and receive real-time updates.
- Only the host (teacher who created the session) can modify scores, trigger power-ups, advance questions, reveal answers, and terminate sessions.
- Students can only submit their own answers (lock answer action) when status is `answering`.
- GameResults can be created by the host when the game finishes and viewed by the host or participants.
- Users collection can only be modified by the respective authenticated owner.

## 2. Threat Models & Attack Scenarios
1. **Student Score Spoofing**: A student in the browser sending a Firestore update to increase their team's points. *Mitigation: Firestore rule requires `request.auth.uid == resource.data.hostId` for all score mutations and host controls.*
2. **Game Theft/Tampering**: Modifying another teacher's quiz or questions. *Mitigation: Teacher ownership check `request.auth.uid == resource.data.ownerId`.*
3. **Ghost Collection Writes**: Injecting rogue documents or massive junk payloads. *Mitigation: Strict schema, size limits, and ID validation.*
4. **Early Answer Peeking**: Students reading questions or answers before the teacher displays them. *Mitigation: Questions for live sessions can have correct answers sanitized or revealed host-driven, and answer comparison is host-authoritative or validated during reveal.*

## 3. Operations & Access Matrix
- `/users/{userId}`: read by owner; write by owner.
- `/games/{gameId}`: read if `resource.data.visibility == 'public'` or `request.auth.uid == resource.data.ownerId`. Create if signed-in teacher. Update/Delete if owner.
- `/games/{gameId}/questions/{questionId}`: read if parent game is readable; write if owner of parent game.
- `/gameSessions/{sessionId}`: read allowed for participants with valid PIN / session ID; create by authenticated teacher; update only by host (or student adding themselves to `players` list or registering player response during active answering phase).
- `/gameSessions/{sessionId}/actions/{actionId}`: read by participants; write only by host.
- `/gameResults/{resultId}`: read by host or public; write by session host.
