import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import StatusWidget from "../components/StatusWidget";
import Chats from "../components/Chats";
import NotificationsBell from "../components/NotificationsBell";
import FamilyMap from "../components/FamilyMap";
import UserAvatar from "../components/UserAvatar";
import ProfileModal from "../components/ProfileModal";
import BottomNav from "../components/BottomNav";
import Settings from "./Settings";
import useOnlineStatus from "../hooks/useOnlineStatus";

export default function Home() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [family, setFamily] = useState(null);
  const [tab, setTab] = useState("chats");
  const [profileOpen, setProfileOpen] = useState(null);

  useOnlineStatus(user);

  useEffect(() => {
    if (!profile?.familyId) return;
    const unsub = onSnapshot(doc(db, "families", profile.familyId), (d) => {
      if (d.exists()) setFamily({ id: d.id, ...d.data() });
    });
    return unsub;
  }, [profile?.familyId]);

  useEffect(() => {
    if (!profile?.familyId) return;
    const q = query(
      collection(db, "users"),
      where("familyId", "==", profile.familyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => d.data()));
    });
    return unsub;
  }, [profile?.familyId]);

  if (!family)
    return <div className="p-8 dark:text-white">Загрузка семьи...</div>;

  const tabTitle = {
    home: "Главная",
    chats: "Чаты",
    map: "Карта",
    settings: "Настройки",
  }[tab];

  const openProfile = (u) => {
    if (u && u.uid) setProfileOpen(u);
  };

  return (
    <div className="min-h-screen pb-20">
      <NotificationsBell />

      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 pr-20">
          <h1 className="text-2xl font-bold dark:text-white flex-1">
            {tabTitle}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {tab === "home" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm animate-fade-in">
              <h2 className="font-semibold mb-3 dark:text-white">Кто где</h2>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.uid}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={m}
                        size="md"
                        onClick={openProfile}
                        showOnline
                      />
                      <div>
                        <div className="font-medium leading-tight dark:text-white">
                          {m.displayName}
                        </div>
                        <div className="text-gray-400 text-xs">@{m.nick}</div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap ml-2">
                      {m.statusEmoji} {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-in">
              <StatusWidget />
            </div>
          </div>
        )}

        {tab === "chats" && (
          <div className="animate-fade-in">
            <Chats
              familyId={family.id}
              members={members}
              onOpenProfile={openProfile}
            />
          </div>
        )}

        {tab === "map" && (
          <div className="animate-fade-in">
            <FamilyMap members={members} />
          </div>
        )}

        {tab === "settings" && (
          <div className="animate-fade-in">
            <Settings />
          </div>
        )}
      </main>

      <BottomNav tab={tab} setTab={setTab} />

      {profileOpen && (
        <ProfileModal
          user={profileOpen}
          onClose={() => setProfileOpen(null)}
        />
      )}
    </div>
  );
}