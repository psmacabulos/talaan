import { schoolRepository } from "@/data/repositories";
import { toSchoolJson } from "@/features/parents/api-responses";

/** The schools a parent can pick when linking a child (Step 53.3). Public: only each school's id and name. */
export async function GET() {
  const schools = await schoolRepository.list();
  return Response.json({
    schools: schools.map(toSchoolJson).sort((a, b) => a.name.localeCompare(b.name)),
  });
}
