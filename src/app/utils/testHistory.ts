export const fetchTestHistory = async () => {
  try {
    const response = await fetch("/public/test.txt");
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error reading test.txt:", error);
    return "";
  }
};
