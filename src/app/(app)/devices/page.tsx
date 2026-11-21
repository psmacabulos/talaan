import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { deviceRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { AddDeviceButtons } from "@/features/devices/add-device-buttons";
import { DevicesList } from "@/features/devices/devices-list";
import { getNow } from "@/lib/clock";
import { requireSession } from "@/lib/session";

const TITLE = "Devices";
const DESCRIPTION = "The tablets and screens at your school's gates.";

/**
 * The school's gates and monitors (Step 59.12), for principals and super
 * admins. Connection status is worked out when the page is opened, from
 * when each device was last seen; the page doesn't refresh by itself.
 */
export default async function DevicesPage() {
  const session = await requireSession();

  if (!hasNavAccess(session.role, "devices")) {
    return (
      <AccessDenied reason="Teacher accounts don't manage the school's gates and monitors — that needs a principal or super admin sign-in." />
    );
  }

  // Only a super admin can have no school, until they open one on the Schools page.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <NoSchoolSelected subject="devices" />
      </div>
    );
  }

  const devices = await deviceRepository.listBySchool(session.schoolId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <AddDeviceButtons />
      <DevicesList devices={devices} now={getNow()} />
    </div>
  );
}
