export function createFileData(
  name: string,
  content = "",
  language = "typescript",
) {
  const path = name.startsWith("/") ? name : `/${name}`;
  return {
    name: path.split("/").pop() || name,
    language,
    content,
    path,
    lastModified: Date.now(),
  };
}
