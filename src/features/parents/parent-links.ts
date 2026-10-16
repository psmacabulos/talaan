import { cache } from "react";
import { parentStudentLinkRepository } from "@/data/repositories";
import type { ParentStudentLinkRepository } from "@/data/repositories";

/**
 * A parent's links, read once per page render: the protected layout (the
 * bell) and the page under it both need them. React's `cache` keeps one
 * answer per render and starts empty for the next one, so a Server Action's
 * `refresh()` always reads fresh links. Shaped like the repository, so the
 * parent services take it as their `links`.
 */
export const parentLinks: Pick<ParentStudentLinkRepository, "listByParent"> = {
  listByParent: cache((parentId: string) => parentStudentLinkRepository.listByParent(parentId)),
};
