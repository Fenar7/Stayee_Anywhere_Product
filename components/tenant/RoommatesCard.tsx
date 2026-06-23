import { Users } from "lucide-react";

function RoommateAvatar({ photoUrl, fullName }: { photoUrl: string | null; fullName: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        className="h-10 w-10 rounded-full object-cover border-2 border-border"
      />
    );
  }
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border-2 border-border">
      {initials}
    </div>
  );
}

export function RoommatesCard({ roommates }: { roommates: any[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> Roommates
      </h2>
      {roommates.length > 0 ? (
        <div className="space-y-3">
          {roommates.map((rm, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg border p-3 bg-muted/10">
              <RoommateAvatar photoUrl={rm.photoUrl} fullName={rm.fullName} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{rm.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {rm.occupationType === "STUDENT"
                    ? `Student at ${rm.collegeName || "—"}`
                    : `Working at ${rm.companyName || "—"}${rm.designation ? ` as ${rm.designation}` : ""}`}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Bed {rm.bedLabel}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No roommates currently registered in your room.
        </p>
      )}
    </div>
  );
}
