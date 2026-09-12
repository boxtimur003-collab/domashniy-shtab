import { useState } from "react";

export default function CreatePollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);

  const addOption = () => {
    if (options.length < 5) setOptions([...options, ""]);
  };

  const removeOption = (idx) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx, value) => {
    const newOpts = [...options];
    newOpts[idx] = value;
    setOptions(newOpts);
  };

  const canSubmit =
    question.trim() && options.filter((o) => o.trim()).length >= 2;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const cleanOptions = options.filter((o) => o.trim());
    await onCreate(question.trim(), cleanOptions);
    setBusy(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 animate-fade-in-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg dark:text-white">
            📊 Создать опрос
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Вопрос */}
        <label className="text-sm font-medium dark:text-white block mb-1">
          Вопрос
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={120}
          placeholder="Например: Куда поедем в отпуск?"
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition mb-4"
          autoFocus
        />

        {/* Варианты */}
        <div className="text-sm font-medium dark:text-white mb-2">
          Варианты ответа (2–5)
        </div>
        <div className="space-y-2 mb-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                maxLength={60}
                placeholder={`Вариант ${idx + 1}`}
                className="flex-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(idx)}
                  className="w-9 h-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 5 && (
          <button
            onClick={addOption}
            className="w-full text-primary dark:text-indigo-400 text-sm py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition mb-4"
          >
            + Добавить вариант
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="flex-1 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2.5 font-medium disabled:opacity-50 transition"
          >
            {busy ? "..." : "📊 Создать опрос"}
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2.5 transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}