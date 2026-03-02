

## Plan: Fix Voice Message Functionality

### Root Cause

Two issues prevent voice messages from working:

1. **File type validation mismatch**: `MediaRecorder` produces MIME types with codec parameters (e.g., `audio/webm;codecs=opus`), but `useFileUpload.ts` uses exact string matching (`allowedTypes.includes(file.type)`), so the check fails and shows "File type not supported".

2. **Broken user gesture chain**: `VoiceRecorder.tsx` calls `startRecording()` inside a `useEffect`, which breaks the browser's requirement that `getUserMedia` is triggered directly by a user gesture. This causes microphone access to be silently denied in many browsers.

### Changes

#### 1. Fix file type validation in `src/hooks/useFileUpload.ts`
- Change the type check from exact match (`allowedTypes.includes(file.type)`) to a prefix-based check that strips codec parameters before comparison.
- Example: `file.type.split(';')[0]` will turn `"audio/webm;codecs=opus"` into `"audio/webm"`, which matches the allowed list.

#### 2. Fix user gesture handling in `src/components/VoiceRecorder.tsx`
- Remove the `useEffect` that calls `startRecording()` on mount.
- Instead, call `startRecording()` directly when the user clicks the mic button in `ChatInput.tsx` (before `VoiceRecorder` mounts), or have `VoiceRecorder` auto-start via a ref callback tied to the user gesture chain.
- Simplest approach: move `startRecording()` call into `ChatInput.tsx`'s mic button click handler, passing the recording state down.

#### 3. Update `src/components/ChatInput.tsx`
- Call `startRecording()` directly in the mic button's `onClick` handler to maintain the user gesture chain, then set `isRecording` to `true`.

