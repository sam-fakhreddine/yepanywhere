# Epic: Voice Input for Prompts

**Epic ID:** Q4-001
**Priority:** P1
**Quarter:** Q4 2026
**Estimated Effort:** 3 weeks
**Status:** Planning

---

## Problem Statement

Mobile users can't easily type long prompts on phones, especially while multitasking. Voice input would enable hands-free supervision.

**Target Outcome:** Press-and-hold voice input with real-time transcription preview for all prompt inputs.

---

## User Stories

### US-001: Voice prompt input
- [ ] Press-and-hold microphone button to record
- [ ] Real-time transcription preview as you speak
- [ ] Release to submit (or tap cancel)
- [ ] Works in main prompt input
- [ ] Works in approval responses

### US-002: Voice-to-text quality
- [ ] Use Web Speech API (browser native)
- [ ] Fallback to Whisper API for better accuracy
- [ ] Support technical terms (code, file names)
- [ ] Punctuation and formatting from speech
- [ ] Multiple language support

### US-003: Voice in notifications
- [ ] Reply to approval notifications via voice
- [ ] Voice reply from lock screen (native app)
- [ ] Quick voice commands ("approve", "deny")

### US-004: Voice settings
- [ ] Enable/disable voice input
- [ ] Choose transcription service
- [ ] Language preference
- [ ] Silence detection sensitivity

---

## Technical Approach

```typescript
interface VoiceInputState {
  recording: boolean;
  transcript: string;
  interim: string;
  error: string | null;
}

function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    recording: false,
    transcript: '',
    interim: '',
    error: null,
  });

  const recognition = useMemo(() => {
    if (!('webkitSpeechRecognition' in window)) return null;
    const r = new webkitSpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    return r;
  }, []);

  const startRecording = useCallback(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: prev.transcript + final,
        interim,
      }));
    };

    recognition.start();
    setState(prev => ({ ...prev, recording: true }));
  }, [recognition]);

  const stopRecording = useCallback(() => {
    recognition?.stop();
    setState(prev => ({
      ...prev,
      recording: false,
      transcript: prev.transcript + prev.interim,
      interim: '',
    }));
  }, [recognition]);

  return { ...state, startRecording, stopRecording };
}
```

### Whisper API Fallback

```typescript
async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const result = await response.json();
  return result.text;
}
```

---

## Subagent Assignments

### Frontend Agent
- Voice input component with recording UI
- Web Speech API integration
- Real-time transcription display
- Press-and-hold gesture handling
- Settings page for voice config

### Backend Agent
- Whisper API integration (optional)
- Audio processing endpoint
- Language detection

### Mobile Agent
- Test on iOS Safari
- Test on Android Chrome
- Native app voice integration
- Notification voice reply

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Voice input usage | 15% of mobile prompts |
| Transcription accuracy | 95%+ for common terms |
| Voice adoption | 25% of mobile users try |
