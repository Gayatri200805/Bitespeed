import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface IdentifyRequest {
  email: string | null;
  phoneNumber: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export async function identifyContact(
  request: IdentifyRequest
): Promise<IdentifyResponse> {
  const { email, phoneNumber } = request;

  // Step 1: Find all contacts matching the given email OR phoneNumber
  const matchingContacts = await prisma.contact.findMany({
    where: {
      AND: [{ deletedAt: null }],
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Step 2: No existing contacts found => create a new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
      },
    });

    return {
      contact: {
        primaryContatctId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }

  // Step 3: Collect ALL primary contact IDs linked to these matches
  const primaryIds = new Set<number>();

  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === "primary") {
      primaryIds.add(contact.id);
    } else if (contact.linkedId) {
      primaryIds.add(contact.linkedId);
    }
  }

  // Step 4: If two different primaries found, merge them
  const primaryIdsArray = Array.from(primaryIds);

  if (primaryIdsArray.length > 1) {
    const primaryContacts = await prisma.contact.findMany({
      where: { id: { in: primaryIdsArray } },
      orderBy: { createdAt: "asc" },
    });

    const oldestPrimary = primaryContacts[0];
    const newerPrimaries = primaryContacts.slice(1);

    for (const newerPrimary of newerPrimaries) {
      await prisma.contact.update({
        where: { id: newerPrimary.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: oldestPrimary.id,
          updatedAt: new Date(),
        },
      });

      await prisma.contact.updateMany({
        where: { linkedId: newerPrimary.id },
        data: {
          linkedId: oldestPrimary.id,
          updatedAt: new Date(),
        },
      });
    }
  }

  // Step 5: Determine the single primary contact
  const allPrimaryContacts = await prisma.contact.findMany({
    where: {
      id: { in: primaryIdsArray },
      linkPrecedence: "primary",
    },
    orderBy: { createdAt: "asc" },
  });

  const primaryContact = allPrimaryContacts[0];

  // Step 6: Check if we need to create a new secondary contact
  const allLinkedContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: primaryContact.id },
        { linkedId: primaryContact.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const existingEmails = new Set(
    allLinkedContacts.map((c) => c.email).filter(Boolean)
  );
  const existingPhones = new Set(
    allLinkedContacts.map((c) => c.phoneNumber).filter(Boolean)
  );

  const isNewEmail = email && !existingEmails.has(email);
  const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

  const exactMatchExists = allLinkedContacts.some(
    (c) =>
      (email ? c.email === email : !c.email) &&
      (phoneNumber ? c.phoneNumber === phoneNumber : !c.phoneNumber)
  );

  if ((isNewEmail || isNewPhone) && !exactMatchExists) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: "secondary",
      },
    });
  }

  // Step 7: Re-fetch ALL contacts in this linked group
  const finalContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: primaryContact.id },
        { linkedId: primaryContact.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Step 8: Build the response
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryContactIds: number[] = [];

  if (primaryContact.email) emails.push(primaryContact.email);
  if (primaryContact.phoneNumber) phoneNumbers.push(primaryContact.phoneNumber);

  for (const contact of finalContacts) {
    if (contact.id === primaryContact.id) continue;

    secondaryContactIds.push(contact.id);

    if (contact.email && !emails.includes(contact.email)) {
      emails.push(contact.email);
    }
    if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
      phoneNumbers.push(contact.phoneNumber);
    }
  }

  return {
    contact: {
      primaryContatctId: primaryContact.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
}
