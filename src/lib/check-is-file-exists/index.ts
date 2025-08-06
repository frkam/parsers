import { access } from "node:fs/promises";

export const checkIsFileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};
