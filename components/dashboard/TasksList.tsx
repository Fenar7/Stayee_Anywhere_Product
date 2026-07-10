import Link from "next/link";
import { prisma } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
import { formatRelativeTime } from "@/lib/dates";

export async function TasksList({ organizationId }: { organizationId: string }) {
  // Fetch up to 10 pending/in-progress tasks for the organization, ordered by deadline
  const tasks = await prisma.task.findMany({
    where: {
      hostel: {
        organizationId: organizationId,
      },
      status: {
        in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
      },
    },
    include: {
      assignedToWarden: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      hostel: {
        select: { name: true },
      },
    },
    orderBy: {
      deadline: 'asc',
    },
    take: 10,
  });

  // Group tasks by day (ignoring time)
  // Format we want for keys: "YYYY-MM-DD"
  const grouped = tasks.reduce((acc, task) => {
    const d = new Date(task.deadline);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  // Sort keys ascending just in case, and take top 4 dates max
  const sortedDates = Object.keys(grouped).sort().slice(0, 4);

  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white">Tasks</h3>
        <Link 
          href="/admin/tasks"
          className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          View All
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800">
        {sortedDates.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#767676]">
            No pending tasks at the moment!
          </div>
        ) : (
          sortedDates.map((dateKey, index) => {
            const dayTasks = grouped[dateKey];
            const dateObj = new Date(dateKey);
            const dayNum = dateObj.getDate();
            const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            return (
              <div key={dateKey} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0">
                {/* Tasks column */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 min-w-0">
                  {dayTasks.map((task) => {
                    const assigneeName = task.assignedToWarden.user.name || task.assignedToWarden.user.email?.split('@')[0] || "Warden";
                    const deadlineStr = new Date(task.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    const relativeDeadline = formatRelativeTime(task.deadline);
                    const isOverdue = new Date(task.deadline) < new Date();
                    
                    return (
                      <TaskItem 
                        key={task.id} 
                        title={task.title}
                        assigned={`Assigned to ${assigneeName} • ${task.hostel.name}`}
                        deadline={`${isOverdue ? 'Overdue' : 'Due'} ${relativeDeadline} at ${deadlineStr}`}
                        isOverdue={isOverdue}
                      />
                    );
                  })}
                </div>
                {/* Day badge */}
                <div className="flex flex-col items-center gap-0.5 shrink-0 w-10 mt-1">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                      index === 0 // Highlight the first upcoming date
                        ? "bg-[#282828] text-white"
                        : "bg-[#f2f2f2] dark:bg-zinc-800 text-[#767676]"
                    }`}
                  >
                    {dayNum}
                  </div>
                  <span
                    className={`text-[12px] font-semibold ${
                      index === 0 ? "text-black dark:text-white" : "text-[#767676]"
                    }`}
                  >
                    {dayLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TaskItem({
  title,
  assigned,
  deadline,
  isOverdue,
}: {
  title: string;
  assigned: string;
  deadline: string;
  isOverdue: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className={`mt-1 size-4 rounded-[3px] border shrink-0 ${isOverdue ? 'border-red-400 bg-red-50' : 'border-[#dedede]'}`} />
      <div className="flex flex-col min-w-0">
        <h4 className={`text-[14px] font-semibold leading-snug truncate ${isOverdue ? 'text-red-600' : 'text-black dark:text-white'}`}>
          {title}
        </h4>
        <p className="text-[12px] text-[#a1a1a1] leading-snug truncate mt-0.5">{assigned}</p>
        <p className={`text-[12px] leading-snug truncate mt-0.5 ${isOverdue ? 'text-red-500' : 'text-[#a1a1a1]'}`}>
          {deadline}
        </p>
      </div>
    </div>
  );
}
