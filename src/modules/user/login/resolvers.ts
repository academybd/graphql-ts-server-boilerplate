import * as bcrypt from "bcryptjs";

import { ResolverMap } from "../../../types/graphql-utils";
import {
  invalidLogin,
  confirmEmailError,
  forgotPasswordLockedError
} from "./errorMessages";
import { User } from "../../../models/user";
import { GQL } from "../../../types/schema";
import { userSessionIdPrefix } from "../../../constants";
import { redis } from "../../../redis";

const errorResponse = [
  {
    path: "email",
    message: invalidLogin
  }
];

export const resolvers: ResolverMap = {
  Mutation: {
    login: async (
      _,
      { email, password }: GQL.ILoginOnMutationArguments,
      { session, req }
    ) => {
      const user = await User.findOne({ email });

      if (!user) {
        return errorResponse;
      }

      if (!user.confirmed) {
        return [
          {
            path: "email",
            message: confirmEmailError
          }
        ];
      }

      if (user.forgotPasswordLocked) {
        return [
          {
            path: "email",
            message: forgotPasswordLockedError
          }
        ];
      }

      const valid = await bcrypt.compare(password, user.password as string);

      if (!valid) {
        return errorResponse;
      }

      // login sucessful
      session.userId = user._id;
      if (req.sessionID) {
        await redis.lpush(`${userSessionIdPrefix}${user.id}`, req.sessionID);
      }

      return null;
    }
  }
};
