const DAYS = [
  { num: 1, label: "Mon" },
  { num: 2, label: "Tue" },
  { num: 3, label: "Wed" },
  { num: 4, label: "Thu" },
];

const TASKS: Record<number, { title: string; assigned: string; deadline: string }[]> = {
  1: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Onboard Ashiq", assigned: "Assigned from HQ", deadline: "Deadline March 3 3:33 PM" },
  ],
  2: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
  ],
  3: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Onboard New Staff", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
  ],
  4: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Check Inventory", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
  ],
};

export function TasksList() {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white">Tasks</h3>
        <button className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition-opacity">
          View All
        </button>
      </div>

      <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800">
        {DAYS.map((day, dayIdx) => (
          <div key={day.num} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0">
            {/* Tasks column */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 min-w-0">
              {(TASKS[day.num] ?? []).map((task, i) => (
                <TaskItem key={i} {...task} />
              ))}
            </div>
            {/* Day badge */}
            <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                  dayIdx === 1
                    ? "bg-[#282828] text-white"
                    : "bg-[#f2f2f2] dark:bg-zinc-800 text-[#767676]"
                }`}
              >
                {day.num}
              </div>
              <span
                className={`text-[12px] font-semibold ${
                  dayIdx === 1 ? "text-black dark:text-white" : "text-[#767676]"
                }`}
              >
                {day.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskItem({
  title,
  assigned,
  deadline,
}: {
  title: string;
  assigned: string;
  deadline: string;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="mt-0.5 size-4 rounded-[3px] border border-[#dedede] shrink-0" />
      <div className="flex flex-col min-w-0">
        <h4 className="text-[14px] font-semibold text-black dark:text-white leading-snug truncate">{title}</h4>
        <p className="text-[12px] text-[#a1a1a1] leading-snug">{assigned}</p>
        <p className="text-[12px] text-[#a1a1a1] leading-snug">{deadline}</p>
      </div>
    </div>
  );
}
