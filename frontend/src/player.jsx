import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";

// One <audio> for the whole app, so the music keeps playing while the user moves between pages.
const PlayerContext = createContext(null);

const SAVE_EVERY_SECONDS = 15;
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  if (audioRef.current === null) audioRef.current = new Audio();
  const audio = audioRef.current;

  const [book, setBook] = useState(null); // the book that is playing (with its chapters)
  const [chapter, setChapter] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [sleepMinutes, setSleepMinutes] = useState(0);

  const lastSaved = useRef(0);
  const sleepTimer = useRef(null);

  // Send the position to the server (only for logged-in users)
  function saveProgress() {
    if (!user || !chapter) return;
    lastSaved.current = audio.currentTime;
    api.post("/progress", { chapter_id: chapter.id, position_seconds: Math.floor(audio.currentTime) }).catch(() => {});
  }

  // Listen to the <audio> element
  useEffect(() => {
    const onTime = () => {
      setPosition(audio.currentTime);
      if (Math.abs(audio.currentTime - lastSaved.current) >= SAVE_EVERY_SECONDS) saveProgress();
    };
    const onMeta = () => setDuration(audio.duration || chapter?.duration_seconds || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      saveProgress();
    };
    const onEnded = () => {
      saveProgress();
      next();
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  });

  // Start a chapter. startAt = seconds (e.g. the saved position).
  function playChapter(newBook, newChapter, startAt = 0) {
    if (!newChapter?.audio_file) return;

    if (chapter && newChapter.id === chapter.id) {
      audio.play();
      return;
    }

    saveProgress(); // remember where we stopped in the old chapter
    setBook(newBook);
    setChapter(newChapter);
    setPosition(startAt);
    setDuration(newChapter.duration_seconds || 0);

    audio.src = newChapter.audio_file;
    audio.playbackRate = speed;
    audio.currentTime = startAt;
    lastSaved.current = startAt;
    audio.play().catch(() => setPlaying(false));
  }

  // Play from anywhere with only ids (e.g. a "continue" card): loads the book with its chapters first
  async function playById(bookId, chapterId, startAt = 0) {
    const fullBook = await api.get(`/books/${bookId}`);
    const target = fullBook.chapters.find((c) => c.id === chapterId) || fullBook.chapters.find((c) => c.audio_file);
    if (target?.audio_file) playChapter(fullBook, target, startAt);
    else navigate(`/books/${bookId}`); // no audio yet: show the book (it can be read)
  }

  function toggle() {
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function seek(seconds) {
    audio.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
    setPosition(audio.currentTime);
  }

  function skip(seconds) {
    seek(audio.currentTime + seconds);
  }

  // Next / previous chapter that has audio
  function chapterWithAudio(step) {
    if (!book || !chapter) return null;
    const list = book.chapters.filter((c) => c.audio_file);
    const index = list.findIndex((c) => c.id === chapter.id);
    return list[index + step] || null;
  }

  function next() {
    const nextChapter = chapterWithAudio(1);
    if (nextChapter) playChapter(book, nextChapter, 0);
  }

  function previous() {
    if (audio.currentTime > 5) return seek(0); // like music players: first back to the start
    const previousChapter = chapterWithAudio(-1);
    if (previousChapter) playChapter(book, previousChapter, 0);
  }

  function setSpeed(value) {
    audio.playbackRate = value;
    setSpeedState(value);
  }

  // Sleep timer: pause after N minutes (0 = off)
  function setSleep(minutes) {
    clearTimeout(sleepTimer.current);
    setSleepMinutes(minutes);
    if (minutes) {
      sleepTimer.current = setTimeout(() => {
        audio.pause();
        setSleepMinutes(0);
      }, minutes * 60 * 1000);
    }
  }

  const value = {
    book, chapter, playing, position, duration, speed, sleepMinutes,
    playChapter, playById, toggle, seek, skip, next, previous, setSpeed, setSleep,
    hasNext: Boolean(chapterWithAudio(1)),
    hasPrevious: Boolean(chapterWithAudio(-1)),
  };
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
