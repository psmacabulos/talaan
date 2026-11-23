import type { ParentRepository } from "@/data/repositories";
import { TOO_MANY_TRIES_MESSAGE } from "@/features/auth/messages";
import { checkParentSignIn, type ParentSignInDeps } from "./check-parent-sign-in";

export const WRONG_PASSWORD_MESSAGE = "That password isn't right.";
export const ENTER_PASSWORD_MESSAGE = "Enter your password to delete your account.";
export const ACCOUNT_GONE_MESSAGE = "This account has already been deleted.";

export type DeleteParentAccountResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_input" | "wrong_password" | "too_many_tries" | "unauthorized";
      formError: string;
    };

export type DeleteParentAccountDeps = Omit<ParentSignInDeps, "parents"> & {
  parents: Pick<ParentRepository, "getById" | "verifyPassword" | "deleteAccount">;
};

/**
 * A parent deletes their own account (Step 60.2), after confirming with the
 * password. Shared by the web portal and the parent app's API.
 *
 * The password is checked by the same code as sign-in, so it has the same
 * limits (5 wrong tries lock the email for 15 minutes, 30 per address).
 * The email comes from the database for `parentId`, never from the request,
 * and the account the password matched must be that same parent: a parent
 * can never be used to test another account's password.
 *
 * What goes, and the one transaction that does it, is
 * `ParentRepository.deleteAccount`. Nothing here is logged with a name.
 */
export async function deleteParentAccount(
  parentId: string,
  password: unknown,
  deps: DeleteParentAccountDeps,
): Promise<DeleteParentAccountResult> {
  const gone: DeleteParentAccountResult = { ok: false, code: "unauthorized", formError: ACCOUNT_GONE_MESSAGE };

  const parent = await deps.parents.getById(parentId);
  if (!parent) return gone;

  const checked = await checkParentSignIn({ email: parent.email, password }, deps);
  if (!checked.ok) {
    switch (checked.code) {
      case "invalid_input":
        return { ok: false, code: "invalid_input", formError: ENTER_PASSWORD_MESSAGE };
      case "too_many_tries":
        return { ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE };
      case "wrong_credentials":
        return { ok: false, code: "wrong_password", formError: WRONG_PASSWORD_MESSAGE };
    }
  }
  if (checked.parent.id !== parentId) return gone;

  return (await deps.parents.deleteAccount(parentId)) ? { ok: true } : gone;
}
