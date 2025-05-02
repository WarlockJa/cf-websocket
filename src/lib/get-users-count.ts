export default function getUsersCount(msg: string): number | undefined {
  return msg.includes("SYSTEM_USER_COUNT: ")
    ? Number(msg.split(" ")[1])
    : undefined;
}
