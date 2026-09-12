import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function PollMessage({ poll, chatPath, mine }) {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);

  const votes = poll.votes || {};
  const totalVotes = Object.values(votes).reduce(
    (sum, users) => sum + (users?.length || 0),
    0
  );
  const myVote = Object.entries(votes).find(([, users]) =>
    users.includes(user.uid)
  )?.[0];

  const vote = async (option) => {
    if (voting) return;
    setVoting(true);
    try {
      const newVotes = { ...votes };
      // Убираем мой старый голос
      Object.keys(newVotes).forEach((opt) => {
        newVotes[opt] = (newVotes[opt] || []).filter((u) => u !== user.uid);
      });
      // Если я голосовал за этот же — просто снимаем (toggle)
      if (myVote === option) {
        // уже убрали голос
      } else {
        // Добавляем новый голос
        newVotes[option] = [...(newVotes[option] || []), user.uid];
      }
      await updateDoc(doc(db, chatPath.collection, chatPath.id, "messages", poll.id), {
        votes: newVotes,
      });
    } catch (e) {
      console.error(e);
    }
    setVoting(false);
  };

  return (
    <div className="min-w-[220px]">
      <div
        className={`text-xs font-medium mb-2 flex items-center gap-1 ${
          mine ? "text-white/80" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        📊 Опрос
      </div>

      <div className="font-semibold text-sm mb-2 break-words">
        {poll.question}
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const count = (votes[opt] || []).length;
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const isMyVote = myVote === opt;

          return (
            <button
              key={opt}
              onClick={() => vote(opt)}
              disabled={voting}
              className={`w-full text-left relative overflow-hidden rounded-lg border transition ${
                isMyVote
                  ? mine
                    ? "border-white bg-white/10"
                    : "border-primary bg-indigo-50 dark:bg-indigo-900/30"
                  : mine
                  ? "border-white/30 bg-white/5 hover:bg-white/10"
                  : "border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              {/* Прогресс-бар */}
              <div
                className={`absolute top-0 left-0 bottom-0 transition-all duration-300 ${
                  mine
                    ? "bg-white/20"
                    : isMyVote
                    ? "bg-indigo-200 dark:bg-indigo-700"
                    : "bg-gray-100 dark:bg-slate-600"
                }`}
                style={{ width: `${pct}%` }}
              />

              <div className="relative flex items-center justify-between px-3 py-1.5 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isMyVote && <span className="text-xs">✓</span>}
                  <span className="text-sm truncate">{opt}</span>
                </div>
                <div
                  className={`text-xs font-medium whitespace-nowrap ${
                    mine ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {count} ({Math.round(pct)}%)
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className={`text-[10px] mt-1.5 ${
          mine ? "text-white/60" : "text-gray-400"
        }`}
      >
        Всего голосов: {totalVotes}
      </div>
    </div>
  );
}