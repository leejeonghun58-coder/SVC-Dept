import { type AppMember, requireMember } from "./require-member";

export class AdministratorRequiredError extends Error {
  constructor() {
    super("관리자만 사용할 수 있습니다.");
    this.name = "AdministratorRequiredError";
  }
}

export function assertAdministrator(member: AppMember): AppMember {
  if (member.role !== "admin") throw new AdministratorRequiredError();
  return member;
}

export async function requireAdministrator(): Promise<AppMember> {
  return assertAdministrator(await requireMember());
}
