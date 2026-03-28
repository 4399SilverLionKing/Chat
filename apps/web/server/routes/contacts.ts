import { Router } from "express";

import type { WeFlowContact } from "@chat-tools/shared";

import type { ApiContact } from "../models.js";

type ContactsRouteDependencies = {
  listContacts: () => Promise<WeFlowContact[]>;
};

function isPrivateContact(contact: WeFlowContact): boolean {
  return contact.contactType === "friend";
}

function toApiContact(contact: WeFlowContact): ApiContact {
  return {
    wxid: contact.username,
    wechatId: contact.alias,
    displayName: contact.displayName,
    remark: contact.remark,
    nickname: contact.nickname,
    avatarUrl: contact.avatarUrl,
  };
}

function sortContacts(contacts: ApiContact[]): ApiContact[] {
  return [...contacts].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "zh-CN"),
  );
}

export function createContactsRouter(
  dependencies: ContactsRouteDependencies,
): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    try {
      const contacts = await dependencies.listContacts();
      response.json({
        contacts: sortContacts(
          contacts.filter(isPrivateContact).map(toApiContact),
        ),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      response.status(500).json({
        error: {
          code: "CONTACTS_LOAD_FAILED",
          message,
        },
      });
    }
  });

  return router;
}
