import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Bell } from "lucide-react";

export default async function BenachrichtigungenPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const notificationsRaw = await getNotifications(session.user.id);
  const notifications = Array.isArray(notificationsRaw) ? notificationsRaw : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader title="Benachrichtigungen" description={`${unreadCount} ungelesen`}>
        {unreadCount > 0 && (
          <form
            action={async () => {
              "use server";
              await markAllNotificationsRead(session.user.id);
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Alle als gelesen markieren
            </Button>
          </form>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState
          title="Keine Benachrichtigungen"
          description="Sie haben derzeit keine Benachrichtigungen."
          icon={<Bell className="h-8 w-8" />}
        />
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-4 px-4 py-4 ${!n.isRead ? "bg-flx-blue-light/30" : ""}`}
            >
              <div className="mt-0.5 rounded-full bg-gray-100 p-2">
                <Bell className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-flx-navy">{n.title}</span>
                  {!n.isRead && <Badge variant="default">Neu</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.createdAt)}</p>
                {n.link && (
                  <Link href={n.link} className="mt-2 inline-block text-sm text-flx-blue hover:underline">
                    Details anzeigen →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
