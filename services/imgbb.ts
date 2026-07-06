"use client";

const API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

export async function uploadToImgbb(file: File): Promise<string> {
  if (!API_KEY) {
    throw new Error("Missing NEXT_PUBLIC_IMGBB_API_KEY env variable");
  }

  const base64 = await fileToBase64(file);

  const formData = new FormData();
  formData.append("key", API_KEY);
  formData.append("image", base64);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message ?? "imgbb upload failed");
  }

  return json.data.display_url;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
