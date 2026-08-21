import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    validatorCheckpointIds: string[];
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      validatorCheckpointIds: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    validatorCheckpointIds: string[];
  }
}
