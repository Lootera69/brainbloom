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

export async function uploadToImgbbWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  if (!API_KEY) {
    throw new Error("Missing NEXT_PUBLIC_IMGBB_API_KEY env variable");
  }

  const base64 = await fileToBase64(file);

  const formData = new FormData();
  formData.append("key", API_KEY);
  formData.append("image", base64);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.upload.onerror = () => reject(new Error("Upload failed"));
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error(`HTTP ${xhr.status}`));
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText);
        if (!json.success) {
          reject(new Error(json.error?.message ?? "imgbb upload failed"));
          return;
        }
        resolve(json.data.display_url);
      } catch {
        reject(new Error("Failed to parse upload response"));
      }
    };
    xhr.open("POST", "https://api.imgbb.com/1/upload");
    xhr.send(formData);
  });
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
