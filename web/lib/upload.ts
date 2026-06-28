const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export async function uploadCoverImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("cover", file);

  const res = await fetch(`${API_BASE_URL}/upload/cover`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: { message: "上传失败" } }));
    throw new Error(data.error?.message || "上传失败");
  }

  const data = await res.json();
  return data.data.path as string;
}
