import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import User from "../models/user";

const expo = new Expo();

export const sendPushNotifications = async (
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, any>
) => {
  // Filter valid tokens
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));

  if (validTokens.length === 0) return;

  let messages: ExpoPushMessage[] = [];

  for (let token of validTokens) {
    messages.push({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data,
      priority: "high"
    });
  }

  let chunks = expo.chunkPushNotifications(messages);
  let tickets: ExpoPushTicket[] = [];

  // Send Chunks
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Expo Transport Error:", error);
    }
  }

  // Handle Dead Tokens
  const deadTokens: string[] = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status === "error") {
      console.error(`Error sending notification: ${ticket.message}`);
      if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
        deadTokens.push(validTokens[index]);
      }
    }
  });

  // Cleanup
  if (deadTokens.length > 0) {
    console.log(`Cleaning up ${deadTokens.length} dead tokens...`);
    await User.updateMany(
      { pushTokens: { $in: deadTokens } },
      { $pull: { pushTokens: { $in: deadTokens } } }
    );
  }
};
